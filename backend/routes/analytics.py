"""
Analytics routes for advanced data processing with pandas.
Provides endpoints for spending analysis, cash flow, trends, and more.
"""
from flask import Blueprint, request, jsonify
from services.analytics import AnalyticsService
from utils.decorators import token_required
from datetime import date

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/analytics/spending-by-category', methods=['GET', 'OPTIONS'])
@token_required
def spending_by_category(user_id, user_email):
    """
    Get spending breakdown by category with pandas aggregation.
    
    Query params:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
    
    Response: { "categories": [...], "total": X, "period": {...} }
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        result = AnalyticsService.get_spending_by_category(
            user_id,
            start_date=date.fromisoformat(start_date) if start_date else None,
            end_date=date.fromisoformat(end_date) if end_date else None
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Error analyzing spending: {str(e)}'}), 500


@analytics_bp.route('/analytics/cash-flow', methods=['GET', 'OPTIONS'])
@token_required
def cash_flow_analysis(user_id, user_email):
    """
    Get cash flow analysis (income vs expenses over time).
    
    Query params:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - group_by: day|week|month|quarter|year (default: month)
    
    Response: { "cash_flow": [...], "summary": {...} }
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        group_by = request.args.get('group_by', 'month')
        
        if group_by not in ['day', 'week', 'month', 'quarter', 'year']:
            return jsonify({'error': 'Invalid group_by. Use: day, week, month, quarter, year'}), 400
        
        result = AnalyticsService.get_cash_flow_analysis(
            user_id,
            start_date=date.fromisoformat(start_date) if start_date else None,
            end_date=date.fromisoformat(end_date) if end_date else None,
            group_by=group_by
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Error analyzing cash flow: {str(e)}'}), 500


@analytics_bp.route('/analytics/trends', methods=['GET', 'OPTIONS'])
@token_required
def trend_analysis(user_id, user_email):
    """
    Get trend analysis with moving averages.
    
    Query params:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - window: Moving average window (default: 3)
    
    Response: { "trends": [...], "insights": {...} }
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        window = int(request.args.get('window', 3))
        
        result = AnalyticsService.get_trend_analysis(
            user_id,
            start_date=date.fromisoformat(start_date) if start_date else None,
            end_date=date.fromisoformat(end_date) if end_date else None,
            window=window
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid parameters'}), 400
    except Exception as e:
        return jsonify({'error': f'Error analyzing trends: {str(e)}'}), 500


@analytics_bp.route('/analytics/category-comparison', methods=['GET', 'OPTIONS'])
@token_required
def category_comparison(user_id, user_email):
    """
    Compare category spending across periods.
    
    Query params:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
    
    Response: { "comparison": [...], "period": {...} }
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        result = AnalyticsService.get_category_comparison(
            user_id,
            start_date=date.fromisoformat(start_date) if start_date else None,
            end_date=date.fromisoformat(end_date) if end_date else None
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Error comparing categories: {str(e)}'}), 500


@analytics_bp.route('/analytics/account-performance', methods=['GET', 'OPTIONS'])
@token_required
def account_performance(user_id, user_email):
    """
    Get account-level performance analytics.
    
    Query params:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
    
    Response: { "accounts": [...] }
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        result = AnalyticsService.get_account_performance(
            user_id,
            start_date=date.fromisoformat(start_date) if start_date else None,
            end_date=date.fromisoformat(end_date) if end_date else None
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Error analyzing account performance: {str(e)}'}), 500


@analytics_bp.route('/analytics/spending-heatmap', methods=['GET', 'OPTIONS'])
@token_required
def spending_heatmap(user_id, user_email):
    """
    Get spending pattern heatmap data.
    
    Query params:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
    
    Response: { "heatmap": [...], "columns": [...] }
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        result = AnalyticsService.get_spending_heatmap(
            user_id,
            start_date=date.fromisoformat(start_date) if start_date else None,
            end_date=date.fromisoformat(end_date) if end_date else None
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Error generating heatmap: {str(e)}'}), 500
