import os
from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from models import db
from routes.auth import auth_bp
from routes.accounts import accounts_bp
from routes.categories import categories_bp
from routes.transactions import transactions_bp
from routes.budgets import budgets_bp
from routes.analytics import analytics_bp
from routes.dashboard import dashboard_bp
from routes.income_sources import income_sources_bp
from routes.loans import loans_bp
from routes.quincenas import quincenas_bp
from routes.recurring_services import recurring_services_bp
from routes.preferences import preferences_bp
from routes.savings import savings_bp
from routes.transfers import transfers_bp

BLUEPRINTS = (
    auth_bp, accounts_bp, categories_bp, transactions_bp, budgets_bp, dashboard_bp,
    income_sources_bp, loans_bp, quincenas_bp, recurring_services_bp, preferences_bp,
    savings_bp, transfers_bp,
)


def create_app():
    """Factory de la aplicación Flask."""
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app,
         resources={r"/*": {"origins": app.config.get('CORS_ORIGINS', '*')}},
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
         allow_headers=['Content-Type', 'Authorization', 'Accept'],
         expose_headers=['Authorization'],
         supports_credentials=True,
         max_age=3600)

    db.init_app(app)

    for bp in BLUEPRINTS:
        app.register_blueprint(bp)
    app.register_blueprint(analytics_bp, url_prefix='/api')

    @app.get('/api/health')
    def health():
        return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()}), 200

    # Todas las respuestas de error son JSON con la forma { "error": "..." }.
    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify({'error': error.description or error.name}), error.code

    @app.errorhandler(Exception)
    def unexpected_error(error):
        db.session.rollback()
        app.logger.exception(error)
        return jsonify({'error': 'Internal server error'}), 500

    return app


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()

    port = int(os.environ.get('PORT', 5000))
    print(f'\033[1;32m  Caudal API\033[0m → http://localhost:{port}/api/health')
    app.run(debug=os.environ.get('FLASK_DEBUG') == '1', host='0.0.0.0', port=port)
