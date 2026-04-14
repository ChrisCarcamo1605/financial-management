"""
Analytics service using pandas for advanced data processing.
Provides aggregation, trend analysis, and forecasting capabilities.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from sqlalchemy import func
from models import db
from models.transaction import Transaction
from models.account import Account
from models.category import Category
from models.budget import Budget


class AnalyticsService:
    """Service for financial analytics using pandas."""

    @staticmethod
    def get_transactions_dataframe(user_id, start_date=None, end_date=None):
        """
        Fetch transactions and convert to pandas DataFrame.
        
        Args:
            user_id: User ID
            start_date: Start date filter (YYYY-MM-DD or date object)
            end_date: End date filter (YYYY-MM-DD or date object)
            
        Returns:
            pandas DataFrame with transaction data
        """
        query = Transaction.query.filter_by(user_id=user_id)
        
        if start_date:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date)
            query = query.filter(Transaction.date >= start_date)
        
        if end_date:
            if isinstance(end_date, str):
                end_date = date.fromisoformat(end_date)
            query = query.filter(Transaction.date <= end_date)
        
        transactions = query.all()
        
        if not transactions:
            return pd.DataFrame()
        
        # Convert to list of dicts
        data = [t.to_dict_with_relations() for t in transactions]
        df = pd.DataFrame(data)
        
        # Ensure date column is datetime
        df['date'] = pd.to_datetime(df['date'])
        
        return df

    @staticmethod
    def get_spending_by_category(user_id, start_date=None, end_date=None):
        """
        Analyze spending by category with pandas aggregation.
        
        Returns:
            dict with category breakdown including amount, count, avg, percentage
        """
        df = AnalyticsService.get_transactions_dataframe(user_id, start_date, end_date)
        
        if df.empty:
            return {'categories': [], 'total': 0}
        
        # Filter expenses only
        expenses_df = df[df['type'] == 'expense']
        
        if expenses_df.empty:
            return {'categories': [], 'total': 0}
        
        # Group by category
        category_stats = expenses_df.groupby('category_name').agg(
            total_amount=('amount', 'sum'),
            transaction_count=('amount', 'count'),
            avg_amount=('amount', 'mean'),
            min_amount=('amount', 'min'),
            max_amount=('amount', 'max')
        ).reset_index()
        
        # Calculate percentages
        total_expenses = category_stats['total_amount'].sum()
        category_stats['percentage'] = (category_stats['total_amount'] / total_expenses * 100).round(2)
        
        # Sort by total amount descending
        category_stats = category_stats.sort_values('total_amount', ascending=False)
        
        # Convert to list of dicts
        categories = category_stats.to_dict('records')
        
        return {
            'categories': categories,
            'total': float(total_expenses),
            'period': {
                'start': start_date.isoformat() if isinstance(start_date, date) else None,
                'end': end_date.isoformat() if isinstance(end_date, date) else None
            }
        }

    @staticmethod
    def get_cash_flow_analysis(user_id, start_date=None, end_date=None, group_by='month'):
        """
        Analyze cash flow (income vs expenses) over time.
        
        Args:
            group_by: 'day', 'week', 'month', 'quarter', 'year'
            
        Returns:
            dict with cash flow time series data
        """
        df = AnalyticsService.get_transactions_dataframe(user_id, start_date, end_date)
        
        if df.empty:
            return {'cash_flow': [], 'summary': {}}
        
        # Set date as index for resampling
        df = df.set_index('date')
        
        # Pivot by type
        pivot_df = df.pivot_table(
            values='amount',
            index=df.index,
            columns='type',
            aggfunc='sum'
        ).fillna(0)
        
        # Resample based on group_by parameter
        freq_map = {
            'day': 'D',
            'week': 'W',
            'month': 'ME',
            'quarter': 'QE',
            'year': 'YE'
        }
        freq = freq_map.get(group_by, 'ME')
        
        resampled_df = pivot_df.resample(freq).sum()
        
        # Calculate net flow
        resampled_df['net'] = resampled_df.get('income', 0) - resampled_df.get('expense', 0)
        resampled_df['cumulative'] = resampled_df['net'].cumsum()
        
        # Reset index and convert to dict
        resampled_df = resampled_df.reset_index()
        resampled_df.rename(columns={'index': 'date'}, inplace=True)
        
        # Ensure income and expense columns exist
        if 'income' not in resampled_df.columns:
            resampled_df['income'] = 0
        if 'expense' not in resampled_df.columns:
            resampled_df['expense'] = 0
        
        cash_flow = resampled_df.to_dict('records')
        
        # Convert dates to ISO format
        for item in cash_flow:
            if isinstance(item.get('date'), (datetime, pd.Timestamp)):
                item['date'] = item['date'].isoformat()
        
        # Summary statistics
        total_income = resampled_df['income'].sum()
        total_expense = resampled_df['expense'].sum()
        net_flow = total_income - total_expense
        savings_rate = (net_flow / total_income * 100) if total_income > 0 else 0
        
        return {
            'cash_flow': cash_flow,
            'summary': {
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'net_flow': float(net_flow),
                'savings_rate': round(float(savings_rate), 2),
                'avg_monthly_income': float(total_income / len(resampled_df)) if len(resampled_df) > 0 else 0,
                'avg_monthly_expense': float(total_expense / len(resampled_df)) if len(resampled_df) > 0 else 0
            }
        }

    @staticmethod
    def get_trend_analysis(user_id, start_date=None, end_date=None, window=3):
        """
        Calculate trends with moving averages.
        
        Args:
            window: Moving average window (in periods)
            
        Returns:
            dict with trend data including moving averages
        """
        df = AnalyticsService.get_transactions_dataframe(user_id, start_date, end_date)
        
        if df.empty:
            return {'trends': [], 'insights': {}}
        
        # Set date as index
        df = df.set_index('date')
        
        # Pivot by type for separate income/expense tracking
        pivot_df = df.pivot_table(
            values='amount',
            index=df.index,
            columns='type',
            aggfunc='sum'
        ).fillna(0).resample('ME').sum()
        
        # Calculate net
        pivot_df['net'] = pivot_df.get('income', 0) - pivot_df.get('expense', 0)
        
        # Calculate moving averages
        pivot_df[f'income_ma{window}'] = pivot_df.get('income', 0).rolling(window=window, min_periods=1).mean()
        pivot_df[f'expense_ma{window}'] = pivot_df.get('expense', 0).rolling(window=window, min_periods=1).mean()
        pivot_df[f'net_ma{window}'] = pivot_df['net'].rolling(window=window, min_periods=1).mean()
        
        # Calculate growth rates
        pivot_df['income_growth'] = pivot_df.get('income', 0).pct_change() * 100
        pivot_df['expense_growth'] = pivot_df.get('expense', 0).pct_change() * 100
        
        # Reset index
        pivot_df = pivot_df.reset_index()
        pivot_df.rename(columns={'index': 'date'}, inplace=True)
        
        # Convert to list
        trends = pivot_df.to_dict('records')
        
        # Convert dates
        for item in trends:
            if isinstance(item.get('date'), (datetime, pd.Timestamp)):
                item['date'] = item['date'].isoformat()
        
        # Generate insights
        insights = AnalyticsService._generate_insights(df, pivot_df)
        
        return {
            'trends': trends,
            'insights': insights
        }

    @staticmethod
    def get_category_comparison(user_id, start_date=None, end_date=None):
        """
        Compare category spending across periods.
        
        Returns:
            dict with current vs previous period comparison
        """
        df = AnalyticsService.get_transactions_dataframe(user_id, start_date, end_date)
        
        if df.empty:
            return {'comparison': []}
        
        # Filter expenses
        expenses_df = df[df['type'] == 'expense'].copy()
        
        if expenses_df.empty:
            return {'comparison': []}
        
        # Current period aggregation
        current_period = expenses_df.groupby('category_name').agg(
            current_amount=('amount', 'sum'),
            current_count=('amount', 'count')
        ).reset_index()
        
        comparison = current_period.to_dict('records')
        
        # Sort by amount
        comparison.sort(key=lambda x: x['current_amount'], reverse=True)
        
        return {
            'comparison': comparison,
            'period': {
                'start': start_date.isoformat() if isinstance(start_date, date) else None,
                'end': end_date.isoformat() if isinstance(end_date, date) else None
            }
        }

    @staticmethod
    def get_account_performance(user_id, start_date=None, end_date=None):
        """
        Analyze performance by account.
        
        Returns:
            dict with account-level analytics
        """
        df = AnalyticsService.get_transactions_dataframe(user_id, start_date, end_date)
        
        if df.empty:
            return {'accounts': []}
        
        # Get all accounts
        accounts = Account.query.filter_by(user_id=user_id).all()
        
        account_performance = []
        for account in accounts:
            acc_df = df[df['account_id'] == account.id]
            
            income = acc_df[acc_df['type'] == 'income']['amount'].sum()
            expenses = acc_df[acc_df['type'] == 'expense']['amount'].sum()
            transaction_count = len(acc_df)
            
            # Calculate average transaction size
            avg_transaction = acc_df['amount'].mean() if transaction_count > 0 else 0
            
            account_performance.append({
                'id': account.id,
                'name': account.name,
                'current_balance': float(account.balance),
                'total_income': float(income),
                'total_expenses': float(expenses),
                'net_flow': float(income - expenses),
                'transaction_count': int(transaction_count),
                'avg_transaction': float(avg_transaction),
                'currency': getattr(account, 'currency', 'USD')
            })
        
        # Sort by net flow
        account_performance.sort(key=lambda x: x['net_flow'], reverse=True)
        
        return {'accounts': account_performance}

    @staticmethod
    def get_spending_heatmap(user_id, start_date=None, end_date=None):
        """
        Create spending pattern heatmap data (day of week vs week number).
        
        Returns:
            dict with heatmap data
        """
        df = AnalyticsService.get_transactions_dataframe(user_id, start_date, end_date)
        
        if df.empty:
            return {'heatmap': []}
        
        expenses_df = df[df['type'] == 'expense'].copy()
        
        if expenses_df.empty:
            return {'heatmap': []}
        
        # Extract day of week
        expenses_df = expenses_df.copy()
        expenses_df['day_of_week'] = expenses_df['date'].dt.day_name()
        expenses_df['week_number'] = expenses_df['date'].dt.isocalendar().week
        
        # Create pivot table: day of week vs week number
        heatmap_df = expenses_df.pivot_table(
            values='amount',
            index='day_of_week',
            columns='week_number',
            aggfunc='sum',
            fill_value=0
        )
        
        # Order days properly
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        heatmap_df = heatmap_df.reindex(day_order)
        
        # Convert to format suitable for frontend
        heatmap_data = []
        for day in day_order:
            if day in heatmap_df.index:
                row = {'day': day}
                row.update(heatmap_df.loc[day].to_dict())
                heatmap_data.append(row)
        
        return {
            'heatmap': heatmap_data,
            'columns': [int(c) for c in heatmap_df.columns]
        }

    @staticmethod
    def _generate_insights(df, pivot_df):
        """Generate analytical insights from data."""
        insights = {}
        
        # Overall trends
        if len(pivot_df) >= 2:
            recent_income = pivot_df.iloc[-1].get('income', 0)
            previous_income = pivot_df.iloc[-2].get('income', 0) if len(pivot_df) >= 2 else 0
            
            if previous_income > 0:
                income_change = ((recent_income - previous_income) / previous_income) * 100
                insights['income_trend'] = 'increasing' if income_change > 5 else ('decreasing' if income_change < -5 else 'stable')
                insights['income_change_pct'] = round(float(income_change), 2)
        
        # Top spending category
        expenses_df = df[df['type'] == 'expense']
        if not expenses_df.empty:
            top_category = expenses_df.groupby('category_name')['amount'].sum().idxmax()
            top_category_amount = expenses_df.groupby('category_name')['amount'].sum().max()
            insights['top_spending_category'] = str(top_category)
            insights['top_category_amount'] = float(top_category_amount)
        
        # Savings rate
        total_income = df[df['type'] == 'income']['amount'].sum()
        total_expenses = df[df['type'] == 'expense']['amount'].sum()
        if total_income > 0:
            savings_rate = ((total_income - total_expenses) / total_income) * 100
            insights['savings_rate'] = round(float(savings_rate), 2)
        
        # Transaction patterns
        insights['total_transactions'] = int(len(df))
        insights['avg_transaction_size'] = round(float(df['amount'].mean()), 2) if len(df) > 0 else 0
        
        return insights
