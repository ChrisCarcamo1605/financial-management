import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_restx import Api, Resource, fields
from config import Config
from models import db
from models.account import Account
from models.category import Category
from models.transaction import Transaction
from models.budget import Budget
from models.income_source import IncomeSource
from models.loan import Loan
from models.loan_payment import LoanPayment
from models.recurring_service import RecurringService
from models.user_preferences import UserPreferences
from routes.auth import auth_bp
from routes.accounts import accounts_bp
from routes.categories import categories_bp
from routes.transactions import transactions_bp
from routes.budgets import budgets_bp
from routes.analytics import analytics_bp
from routes.income_sources import income_sources_bp
from routes.loans import loans_bp
from routes.quincenas import quincenas_bp
from routes.recurring_services import recurring_services_bp
from routes.preferences import preferences_bp
from routes.savings import savings_bp
from datetime import datetime, date, timedelta
from sqlalchemy import func


def create_app():
    """Factory function para crear la aplicación Flask."""
    
    app = Flask(__name__)
    
    # Cargar configuración
    app.config.from_object(Config)
    
    # Configurar CORS
    CORS(app,
         resources={r"/*": {"origins": app.config.get('CORS_ORIGINS', '*')}},
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
         allow_headers=['Content-Type', 'Authorization', 'Accept'],
         expose_headers=['Authorization'],
         supports_credentials=True,
         max_age=3600,
         always_send_access_control_headers=True)

    # Configurar Swagger UI
    api = Api(
        app,
        version='1.0',
        title='Financial Management API',
        description='API para gestión financiera personal',
        doc='/api/docs',
        prefix='/api',
        authorizations={
            'BearerAuth': {
                'type': 'apiKey',
                'in': 'header',
                'name': 'Authorization',
                'description': 'Bearer token (format: "Bearer <token>")'
            }
        },
        security='BearerAuth'
    )

    # Namespace para autenticación
    auth_ns = api.namespace('auth', description='Authentication endpoints')
    # Namespace para cuentas
    accounts_ns = api.namespace('accounts', description='Bank accounts management')
    # Namespace para categorías
    categories_ns = api.namespace('categories', description='Transaction categories')
    # Namespace para transacciones
    transactions_ns = api.namespace('transactions', description='Financial transactions')
    # Namespace para presupuestos
    budgets_ns = api.namespace('budgets', description='Budget management')
    # Namespace para dashboard
    dashboard_ns = api.namespace('dashboard', description='Dashboard summary')

    # Inicializar base de datos
    db.init_app(app)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(income_sources_bp)
    app.register_blueprint(loans_bp)
    app.register_blueprint(quincenas_bp)
    app.register_blueprint(recurring_services_bp)
    app.register_blueprint(preferences_bp)
    app.register_blueprint(savings_bp)

    # ========================
    # Swagger Model Definitions
    # ========================

    health_model = api.model('Health', {
        'status': fields.String(description='Server status'),
        'timestamp': fields.String(description='Current timestamp')
    })

    recent_tx_model = api.model('RecentTx', {
        'id': fields.Integer,
        'account_name': fields.String,
        'category_name': fields.String,
        'amount': fields.Float,
        'type': fields.String,
        'description': fields.String,
        'date': fields.String
    })

    dash_account_model = api.model('DashAccount', {
        'id': fields.Integer,
        'name': fields.String,
        'balance': fields.Float,
        'currency': fields.String
    })

    dashboard_summary_model = api.model('DashboardSummary', {
        'total_balance': fields.Float(description='Total balance across all accounts'),
        'monthly_income': fields.Float(description='Total income for current month'),
        'monthly_expense': fields.Float(description='Total expenses for current month'),
        'monthly_net': fields.Float(description='Net income (income - expenses)'),
        'recent_transactions': fields.List(fields.Nested(recent_tx_model), description='Last 10 transactions'),
        'accounts': fields.List(fields.Nested(dash_account_model), description='All user accounts'),
        'budgets_status': fields.List(fields.Raw, description='Active budgets with spent/remaining')
    })

    error_model = api.model('Error', {
        'error': fields.String(description='Error message')
    })

    # ========================
    # Swagger Endpoints
    # ========================

    health_ns = api.namespace('health', description='Health check')

    @health_ns.route('')
    class HealthCheck(Resource):
        @health_ns.doc('health_check')
        @health_ns.marshal_with(health_model)
        def get(self):
            """Health check endpoint"""
            return {'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}, 200

    # Endpoint del Dashboard con autenticación
    @dashboard_ns.route('/summary')
    class DashboardSummaryResource(Resource):
        @dashboard_ns.doc('dashboard_summary')
        def get(self):
            """Obtener resumen del dashboard"""
            from flask import request, jsonify
            from services.auth_service import AuthService

            auth_header = request.headers.get('Authorization', '')
            parts = auth_header.split(' ')
            if len(parts) != 2:
                return jsonify({'error': 'Authentication required'}), 401

            try:
                payload = AuthService.decode_access_token(parts[1])
                if not payload:
                    return jsonify({'error': 'Invalid or expired token'}), 401

                user_id = payload['sub']

                accounts = Account.query.filter_by(user_id=user_id).all()
                total_balance = sum(float(acc.balance) for acc in accounts)

                today = date.today()
                start_of_month = today.replace(day=1)
                if today.month == 12:
                    end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

                monthly_income_result = db.session.query(func.sum(Transaction.amount))\
                    .filter(
                        Transaction.user_id == user_id,
                        Transaction.type == 'income',
                        Transaction.date >= start_of_month,
                        Transaction.date <= end_of_month
                    ).scalar()
                monthly_income = float(monthly_income_result or 0)

                monthly_expense_result = db.session.query(func.sum(Transaction.amount))\
                    .filter(
                        Transaction.user_id == user_id,
                        Transaction.type == 'expense',
                        Transaction.date >= start_of_month,
                        Transaction.date <= end_of_month
                    ).scalar()
                monthly_expense = float(monthly_expense_result or 0)

                monthly_net = monthly_income - monthly_expense

                recent_transactions = Transaction.query\
                    .filter_by(user_id=user_id)\
                    .order_by(Transaction.date.desc())\
                    .limit(10)\
                    .all()

                budgets = Budget.query\
                    .filter(
                        Budget.user_id == user_id,
                        Budget.end_date >= today
                    )\
                    .all()
                budgets_status = [budget.to_dict_full() for budget in budgets]

                return jsonify({
                    'total_balance': total_balance,
                    'monthly_income': monthly_income,
                    'monthly_expense': monthly_expense,
                    'monthly_net': monthly_net,
                    'recent_transactions': [t.to_dict_with_relations() for t in recent_transactions],
                    'accounts': [acc.to_dict() for acc in accounts],
                    'budgets_status': budgets_status,
                })

            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
            except Exception as e:
                return jsonify({'error': f'Dashboard error: {str(e)}'}), 500
    
    # Manejo de errores global
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


if __name__ == '__main__':
    from datetime import timedelta
    
    app = create_app()
    
    # Crear tablas si no existen
    with app.app_context():
        db.create_all()
    
    # Diseño de consola elegante
    print("\033[1;36m" + "="*60 + "\033[0m")
    print("\033[1;32m   FINANCIAL MANAGEMENT API IS STARTING\033[0m")
    print("\033[1;36m" + "="*60 + "\033[0m")
    print(f"   \033[1;34m  Local Server:\033[0m    \033[4;34mhttp://localhost:5000\033[0m")
    print(f"   \033[1;34m  Swagger UI:\033[0m      \033[4;34mhttp://localhost:5000/api/docs\033[0m")
    print(f"   \033[1;34m  OpenAPI Spec:\033[0m    \033[4;34mhttp://localhost:5000/api/swagger.json\033[0m")
    print("\033[1;36m" + "-"*60 + "\033[0m")
    print("   [!] Endpoints Registrados:")
    print("      \033[90m•\033[0m \033[1;32mPOST\033[0m  /api/auth/verify")
    print("      \033[90m•\033[0m \033[1;32mGET\033[0m   /api/auth/me")
    print("      \033[90m•\033[0m \033[1;35mCRUD\033[0m  /api/accounts")
    print("      \033[90m•\033[0m \033[1;35mCRUD\033[0m  /api/categories")
    print("      \033[90m•\033[0m \033[1;35mCRUD\033[0m  /api/transactions")
    print("      \033[90m•\033[0m \033[1;35mCRUD\033[0m  /api/budgets")
    print("      \033[90m•\033[0m \033[1;34mGET\033[0m   /api/dashboard/summary")
    print("      \033[90m•\033[0m \033[1;34mGET\033[0m   /api/health")
    print("\033[1;36m" + "="*60 + "\033[0m\n")
    
    port = int(os.environ.get('PORT', 5000))
    
    app.run(debug=False, host='0.0.0.0', port=port)
