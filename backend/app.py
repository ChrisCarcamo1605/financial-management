from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from models.account import Account
from models.category import Category
from models.transaction import Transaction
from models.budget import Budget
from routes.auth import auth_bp
from routes.accounts import accounts_bp
from routes.categories import categories_bp
from routes.transactions import transactions_bp
from routes.budgets import budgets_bp
from datetime import datetime, date, timedelta
from sqlalchemy import func


def create_app():
    """Factory function para crear la aplicación Flask."""
    
    app = Flask(__name__)
    
    # Cargar configuración
    app.config.from_object(Config)
    
    # Configurar CORS
    CORS(app, origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']))
    
    # Inicializar base de datos
    db.init_app(app)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(budgets_bp)
    
    # Ruta de salud
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}), 200
    
    # Endpoint del Dashboard con autenticación
    @app.route('/api/dashboard/summary', methods=['GET'])
    def dashboard_summary_auth():
        """
        Obtener resumen del dashboard con autenticación.
        """
        from utils.decorators import token_required
        from flask import request
        
        # Obtener user_id del token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            token = auth_header.split(" ")[1]
            from services.supabase_auth import SupabaseAuthService
            user = SupabaseAuthService.verify_token(token)
            
            if not user:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            user_id = user['id']
            
            # Calcular resumen
            try:
                # Balance total
                accounts = Account.query.filter_by(user_id=user_id).all()
                total_balance = sum(float(acc.balance) for acc in accounts)
                
                # Primer y último día del mes actual
                today = date.today()
                start_of_month = today.replace(day=1)
                if today.month == 12:
                    end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
                
                # Ingresos del mes
                monthly_income_result = db.session.query(func.sum(Transaction.amount))\
                    .filter(
                        Transaction.user_id == user_id,
                        Transaction.type == 'income',
                        Transaction.date >= start_of_month,
                        Transaction.date <= end_of_month
                    ).scalar()
                monthly_income = float(monthly_income_result or 0)
                
                # Gastos del mes
                monthly_expense_result = db.session.query(func.sum(Transaction.amount))\
                    .filter(
                        Transaction.user_id == user_id,
                        Transaction.type == 'expense',
                        Transaction.date >= start_of_month,
                        Transaction.date <= end_of_month
                    ).scalar()
                monthly_expense = float(monthly_expense_result or 0)
                
                # Neto mensual
                monthly_net = monthly_income - monthly_expense
                
                # Transacciones recientes (últimas 10)
                recent_transactions = Transaction.query\
                    .filter_by(user_id=user_id)\
                    .order_by(Transaction.date.desc())\
                    .limit(10)\
                    .all()
                
                # Presupuestos activos
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
                    'budgets_status': budgets_status
                }), 200
                
            except Exception as e:
                return jsonify({'error': f'Error fetching dashboard data: {str(e)}'}), 500
                
        except IndexError:
            return jsonify({'error': 'Invalid token format'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 500
    
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
    
    print("🚀 Financial Management API starting...")
    print("📍 Running on: http://localhost:5000")
    print("📚 API Documentation:")
    print("   - POST /api/auth/verify")
    print("   - GET  /api/auth/me")
    print("   - CRUD /api/accounts")
    print("   - CRUD /api/categories")
    print("   - CRUD /api/transactions")
    print("   - CRUD /api/budgets")
    print("   - GET  /api/dashboard/summary")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
