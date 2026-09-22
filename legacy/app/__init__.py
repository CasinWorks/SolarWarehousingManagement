from flask import Flask

from config import Config
from app.extensions import db, login_manager


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Blueprints
    from app.auth import auth_bp
    from app.main import main_bp
    from app.receiving import receiving_bp
    from app.inventory import inventory_bp
    from app.delivery import delivery_bp
    from app.catalog import catalog_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(receiving_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(delivery_bp)
    app.register_blueprint(catalog_bp)

    @app.context_processor
    def inject_branding():
        return {
            "app_name": app.config.get("APP_NAME", "SolarStock Warehouse"),
            "company_name": app.config.get("COMPANY_NAME", "SolarStock Warehouse"),
        }

    with app.app_context():
        db.create_all()

    return app
