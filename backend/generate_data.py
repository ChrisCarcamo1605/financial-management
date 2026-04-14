"""
Data Generator for Financial Management App
Generates ~22,000 fictional records spanning from 2020 to present.

Usage:
    python generate_data.py --user-id YOUR_SUPABASE_USER_ID [--clean]
"""

import argparse
import os
import random
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

from faker import Faker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm

# Add parent directory to path to import models
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import db
from models.account import Account
from models.category import Category
from models.transaction import Transaction
from models.budget import Budget
from config import Config


class DataGenerator:
    """Generates fictional financial data for a user."""

    def __init__(self, user_id: str, clean: bool = False):
        self.user_id = user_id
        self.clean = clean
        self.fake = Faker()
        self.fake.seed_instance(42)  # Reproducible results
        random.seed(42)

        # Date range
        self.start_date = date(2020, 1, 1)
        self.end_date = date.today()
        self.total_days = (self.end_date - self.start_date).days

        # Account and category holders
        self.accounts = []
        self.income_categories = []
        self.expense_categories = []

        # Setup database
        self._setup_db()

    def _setup_db(self):
        """Initialize database connection and session."""
        engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
        session_factory = sessionmaker(bind=engine)
        self.session = session_factory()

    def clean_existing_data(self):
        """Remove existing data for this user."""
        print("\n🗑️  Cleaning existing data...")
        self.session.query(Budget).filter(Budget.user_id == self.user_id).delete()
        self.session.query(Transaction).filter(Transaction.user_id == self.user_id).delete()
        self.session.query(Account).filter(Account.user_id == self.user_id).delete()
        self.session.query(Category).filter(Category.user_id == self.user_id).delete()
        self.session.commit()
        print("✅ Existing data cleaned.\n")

    def generate_accounts(self):
        """Generate fictional bank accounts."""
        print("🏦 Generating accounts...")

        account_defs = [
            {"name": "Main Checking", "balance": random.uniform(2000, 8000), "currency": "USD"},
            {"name": "Savings Account", "balance": random.uniform(10000, 50000), "currency": "USD"},
            {"name": "Credit Card", "balance": random.uniform(-2000, -200), "currency": "USD"},
            {"name": "Cash Wallet", "balance": random.uniform(100, 500), "currency": "USD"},
            {"name": "Investment Account", "balance": random.uniform(5000, 30000), "currency": "USD"},
            {"name": "Emergency Fund", "balance": random.uniform(3000, 10000), "currency": "USD"},
            {"name": "Travel Fund", "balance": random.uniform(500, 3000), "currency": "USD"},
            {"name": "Business Account", "balance": random.uniform(5000, 20000), "currency": "USD"},
        ]

        accounts = []
        for acc_def in account_defs:
            account = Account(
                user_id=self.user_id,
                name=acc_def["name"],
                balance=round(Decimal(str(acc_def["balance"])), 2),
                currency=acc_def["currency"],
                created_at=datetime(2020, 1, 1) + timedelta(days=random.randint(0, 30)),
                updated_at=datetime.now(),
            )
            accounts.append(account)
            self.session.add(account)

        self.session.commit()
        self.accounts = self.session.query(Account).filter(Account.user_id == self.user_id).all()
        print(f"✅ Generated {len(self.accounts)} accounts.\n")
        return self.accounts

    def generate_categories(self):
        """Generate income and expense categories."""
        print("📂 Generating categories...")

        income_defs = [
            {"name": "Salary", "color": "#4CAF50", "icon": "work"},
            {"name": "Freelance", "color": "#8BC34A", "icon": "laptop"},
            {"name": "Investments", "color": "#CDDC39", "icon": "trending_up"},
            {"name": "Gifts", "color": "#FFEB3B", "icon": "card_giftcard"},
            {"name": "Refunds", "color": "#FFC107", "icon": "replay"},
            {"name": "Rental Income", "color": "#FF9800", "icon": "home"},
            {"name": "Bonuses", "color": "#FF5722", "icon": "stars"},
            {"name": "Side Business", "color": "#795548", "icon": "store"},
        ]

        expense_defs = [
            {"name": "Groceries", "color": "#F44336", "icon": "shopping_cart"},
            {"name": "Transport", "color": "#E91E63", "icon": "directions_car"},
            {"name": "Rent/Mortgage", "color": "#9C27B0", "icon": "home"},
            {"name": "Utilities", "color": "#673AB7", "icon": "flash_on"},
            {"name": "Entertainment", "color": "#3F51B5", "icon": "movie"},
            {"name": "Dining Out", "color": "#2196F3", "icon": "restaurant"},
            {"name": "Healthcare", "color": "#00BCD4", "icon": "local_hospital"},
            {"name": "Education", "color": "#009688", "icon": "school"},
            {"name": "Shopping", "color": "#4CAF50", "icon": "shopping_bag"},
            {"name": "Subscriptions", "color": "#8BC34A", "icon": "subscriptions"},
            {"name": "Travel", "color": "#FFEB3B", "icon": "flight"},
            {"name": "Insurance", "color": "#FF9800", "icon": "security"},
        ]

        categories = []
        for cat_def in income_defs:
            cat = Category(
                user_id=self.user_id,
                name=cat_def["name"],
                type="income",
                color=cat_def["color"],
                icon=cat_def["icon"],
                created_at=datetime(2020, 1, 1) + timedelta(days=random.randint(0, 15)),
                updated_at=datetime.now(),
            )
            categories.append(cat)
            self.session.add(cat)

        for cat_def in expense_defs:
            cat = Category(
                user_id=self.user_id,
                name=cat_def["name"],
                type="expense",
                color=cat_def["color"],
                icon=cat_def["icon"],
                created_at=datetime(2020, 1, 1) + timedelta(days=random.randint(0, 15)),
                updated_at=datetime.now(),
            )
            categories.append(cat)
            self.session.add(cat)

        self.session.commit()
        self.income_categories = self.session.query(Category).filter(
            Category.user_id == self.user_id, Category.type == "income"
        ).all()
        self.expense_categories = self.session.query(Category).filter(
            Category.user_id == self.user_id, Category.type == "expense"
        ).all()
        print(f"✅ Generated {len(self.income_categories)} income + {len(self.expense_categories)} expense categories.\n")
        return categories

    def _get_amount_range(self, category_name: str, cat_type: str) -> tuple:
        """Return realistic min/max amounts for a category."""
        ranges = {
            # Income
            "Salary": (3000, 6000),
            "Freelance": (500, 3000),
            "Investments": (200, 2000),
            "Gifts": (50, 500),
            "Refunds": (20, 300),
            "Rental Income": (800, 2000),
            "Bonuses": (500, 5000),
            "Side Business": (300, 2000),
            # Expense
            "Groceries": (50, 250),
            "Transport": (20, 150),
            "Rent/Mortgage": (800, 1800),
            "Utilities": (50, 200),
            "Entertainment": (15, 100),
            "Dining Out": (20, 80),
            "Healthcare": (50, 500),
            "Education": (100, 1000),
            "Shopping": (30, 300),
            "Subscriptions": (10, 50),
            "Travel": (500, 3000),
            "Insurance": (100, 400),
        }
        return ranges.get(category_name, (10, 500))

    def _generate_description(self, category_name: str, tx_type: str) -> str:
        """Generate a realistic transaction description."""
        descriptions = {
            "Salary": [
                "Monthly salary payment",
                "Biweekly salary",
                "Salary - regular pay",
                "Payroll deposit",
            ],
            "Freelance": [
                "Freelance project payment",
                "Client invoice payment",
                "Consulting fee",
                "Contract work payment",
                f"Project for {self.fake.company()}",
            ],
            "Investments": [
                "Dividend payment",
                "Investment return",
                "Stock sale profit",
                "Mutual fund distribution",
            ],
            "Gifts": [
                "Birthday gift",
                "Holiday gift",
                f"Gift from {self.fake.first_name()}",
                "Cash gift",
            ],
            "Refunds": [
                "Product refund",
                "Service refund",
                "Return refund",
                "Overpayment refund",
            ],
            "Rental Income": [
                "Monthly rent payment",
                "Rental income",
                "Tenant payment",
                "Property rent",
            ],
            "Bonuses": [
                "Performance bonus",
                "Year-end bonus",
                "Quarterly bonus",
                "Holiday bonus",
            ],
            "Side Business": [
                "Business revenue",
                "Online sale",
                "Product sale",
                "Service income",
            ],
            "Groceries": [
                f"Grocery shopping at {self.fake.company()}",
                "Weekly groceries",
                "Supermarket purchase",
                f"Food shopping - {self.fake.city()}",
                "Monthly grocery run",
            ],
            "Transport": [
                "Gas station fill-up",
                "Public transport pass",
                "Uber/Lyft ride",
                "Parking fee",
                "Car maintenance",
                "Toll payment",
            ],
            "Rent/Mortgage": [
                "Monthly rent payment",
                "Mortgage payment",
                "Rent - apartment",
                "Housing payment",
            ],
            "Utilities": [
                "Electric bill",
                "Water bill",
                "Internet service",
                "Phone bill",
                "Gas bill",
                "Utility payment",
            ],
            "Entertainment": [
                "Movie tickets",
                "Streaming subscription",
                "Concert tickets",
                "Game purchase",
                "Theme park visit",
            ],
            "Dining Out": [
                f"Restaurant - {self.fake.company()}",
                "Lunch at work",
                "Dinner with friends",
                "Coffee shop",
                "Fast food",
                "Weekend brunch",
            ],
            "Healthcare": [
                "Doctor visit",
                "Pharmacy purchase",
                "Medical supplies",
                "Health insurance",
                "Dental appointment",
            ],
            "Education": [
                "Online course",
                "Textbook purchase",
                "Tuition payment",
                "Training program",
                "Educational materials",
            ],
            "Shopping": [
                "Clothing purchase",
                "Electronics",
                "Home supplies",
                f"Online order from {self.fake.company()}",
                "Department store",
            ],
            "Subscriptions": [
                "Netflix subscription",
                "Spotify premium",
                "Gym membership",
                "Software subscription",
                "Cloud storage",
            ],
            "Travel": [
                "Flight booking",
                "Hotel reservation",
                "Vacation package",
                "Car rental",
                "Travel insurance",
                f"Trip to {self.fake.city()}",
            ],
            "Insurance": [
                "Car insurance",
                "Life insurance",
                "Home insurance",
                "Health insurance premium",
                "Insurance payment",
            ],
        }
        options = descriptions.get(category_name, [f"Payment for {category_name.lower()}"])
        return random.choice(options)

    def _apply_inflation(self, base_amount: float, transaction_date: date) -> float:
        """Apply slight inflation over years to make data more realistic."""
        years_elapsed = (transaction_date - self.start_date).days / 365.0
        inflation_rate = 0.02  # 2% annual inflation
        return base_amount * (1 + inflation_rate) ** years_elapsed

    def generate_transactions(self, target_count: int = 20000):
        """Generate fictional transactions over the date range."""
        print(f"💳 Generating {target_count} transactions...")

        transactions = []
        income_ratio = 0.40  # 40% income, 60% expense
        income_count = int(target_count * income_ratio)
        expense_count = target_count - income_count

        # Generate income transactions
        for _ in tqdm(range(income_count), desc="Income transactions", leave=False):
            category = random.choice(self.income_categories)
            account = random.choice(self.accounts)
            min_amt, max_amt = self._get_amount_range(category.name, "income")
            base_amount = random.uniform(min_amt, max_amt)

            # Random date across the range
            days_offset = random.randint(0, self.total_days)
            tx_date = self.start_date + timedelta(days=days_offset)
            amount = round(self._apply_inflation(base_amount, tx_date), 2)

            tx = Transaction(
                user_id=self.user_id,
                account_id=account.id,
                category_id=category.id,
                amount=amount,
                type="income",
                description=self._generate_description(category.name, "income"),
                date=tx_date,
                created_at=datetime.now() - timedelta(days=random.randint(0, 365)),
                updated_at=datetime.now(),
            )
            transactions.append(tx)

        # Generate expense transactions
        for _ in tqdm(range(expense_count), desc="Expense transactions", leave=False):
            category = random.choice(self.expense_categories)
            account = random.choice(self.accounts)
            min_amt, max_amt = self._get_amount_range(category.name, "expense")
            base_amount = random.uniform(min_amt, max_amt)

            days_offset = random.randint(0, self.total_days)
            tx_date = self.start_date + timedelta(days=days_offset)
            amount = round(self._apply_inflation(base_amount, tx_date), 2)

            tx = Transaction(
                user_id=self.user_id,
                account_id=account.id,
                category_id=category.id,
                amount=amount,
                type="expense",
                description=self._generate_description(category.name, "expense"),
                date=tx_date,
                created_at=datetime.now() - timedelta(days=random.randint(0, 365)),
                updated_at=datetime.now(),
            )
            transactions.append(tx)

        # Batch insert in chunks of 500
        chunk_size = 500
        for i in tqdm(range(0, len(transactions), chunk_size), desc="Inserting transactions"):
            chunk = transactions[i:i + chunk_size]
            for tx in chunk:
                self.session.add(tx)
            self.session.commit()

        print(f"✅ Generated {len(transactions)} transactions.\n")
        return transactions

    def generate_budgets(self):
        """Generate monthly budgets for expense categories."""
        print("📊 Generating budgets...")

        budgets = []
        # Generate budgets for each expense category, monthly, from 2020 to now
        current_date = self.start_date.replace(day=1)
        budget_amounts = {
            "Groceries": (400, 800),
            "Transport": (100, 300),
            "Rent/Mortgage": (800, 1800),
            "Utilities": (100, 250),
            "Entertainment": (50, 150),
            "Dining Out": (100, 300),
            "Healthcare": (100, 300),
            "Education": (100, 500),
            "Shopping": (200, 500),
            "Subscriptions": (30, 100),
            "Travel": (200, 600),
            "Insurance": (150, 400),
        }

        while current_date <= self.end_date:
            # End of month
            if current_date.month == 12:
                end_of_month = current_date.replace(year=current_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_of_month = current_date.replace(month=current_date.month + 1, day=1) - timedelta(days=1)

            for category in self.expense_categories:
                min_amt, max_amt = budget_amounts.get(category.name, (100, 500))
                amount = round(random.uniform(min_amt, max_amt), 2)

                budget = Budget(
                    user_id=self.user_id,
                    category_id=category.id,
                    amount=amount,
                    period="monthly",
                    start_date=current_date,
                    end_date=end_of_month,
                    created_at=datetime.now() - timedelta(days=random.randint(0, 365)),
                    updated_at=datetime.now(),
                )
                budgets.append(budget)
                self.session.add(budget)

            self.session.commit()

            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1, day=1)

        print(f"✅ Generated {len(budgets)} budgets.\n")
        return budgets

    def recalculate_account_balances(self):
        """Recalculate account balances based on transactions."""
        print("🔄 Recalculating account balances...")

        for account in self.accounts:
            income = self.session.query(db.func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == "income",
            ).scalar() or 0

            expenses = self.session.query(db.func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == "expense",
            ).scalar() or 0

            account.balance = round(Decimal(str(income)) - Decimal(str(expenses)), 2)
            account.updated_at = datetime.now()

        self.session.commit()
        print("✅ Account balances recalculated.\n")

    def generate_all(self, transaction_count: int = 20000):
        """Run full data generation pipeline."""
        print("=" * 60)
        print("  FINANCIAL DATA GENERATOR")
        print("=" * 60)
        print(f"  User ID: {self.user_id}")
        print(f"  Date range: {self.start_date} to {self.end_date}")
        print(f"  Target transactions: {transaction_count}")
        print("=" * 60)

        if self.clean:
            self.clean_existing_data()

        self.generate_accounts()
        self.generate_categories()
        self.generate_transactions(transaction_count)
        self.generate_budgets()
        self.recalculate_account_balances()

        print("=" * 60)
        print("  ✅ DATA GENERATION COMPLETE!")
        print("=" * 60)
        print(f"  Accounts:      {len(self.accounts)}")
        print(f"  Categories:    {len(self.income_categories) + len(self.expense_categories)}")
        print(f"  Transactions:  ~{transaction_count}")
        print(f"  Budgets:       {len(self.expense_categories) * 73}")  # ~73 months
        print("=" * 60)

    def cleanup(self):
        """Close database session."""
        self.session.close()


def main():
    parser = argparse.ArgumentParser(description="Generate fictional financial data")
    parser.add_argument(
        "--user-id",
        required=True,
        help="Supabase user ID to associate data with",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clean existing data before generating new data",
    )
    parser.add_argument(
        "--transactions",
        type=int,
        default=20000,
        help="Number of transactions to generate (default: 20000)",
    )

    args = parser.parse_args()

    generator = DataGenerator(user_id=args.user_id, clean=args.clean)
    try:
        generator.generate_all(transaction_count=args.transactions)
    finally:
        generator.cleanup()


if __name__ == "__main__":
    main()
