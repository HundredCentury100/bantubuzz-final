from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from flask_socketio import SocketIO
from flask_migrate import Migrate
from .config import config

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
socketio = SocketIO()
migrate = Migrate()


def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Disable strict slashes to handle both /api/packages and /api/packages/
    app.url_map.strict_slashes = False

    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app,
         origins=app.config['CORS_ORIGINS'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
         expose_headers=['Content-Type', 'Authorization'])
    socketio.init_app(app, cors_allowed_origins=app.config['CORS_ORIGINS'], async_mode='threading')
    migrate.init_app(app, db)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has expired'}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"[JWT ERROR] Invalid token: {error}")
        return {'error': f'Invalid token: {error}'}, 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'error': f'Missing token: {error}'}, 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has been revoked'}, 401

    # Register blueprints
    from .routes import auth, users, creators, brands, packages, campaigns, bookings, messages, notifications, analytics, collaborations, reviews, wallet, categories, brand_wallet
    from .routes import admin  # New admin module structure

    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(users.bp, url_prefix='/api/users')
    app.register_blueprint(creators.bp, url_prefix='/api/creators')
    app.register_blueprint(brands.bp, url_prefix='/api/brands')
    app.register_blueprint(packages.bp, url_prefix='/api/packages')
    app.register_blueprint(campaigns.bp, url_prefix='/api/campaigns')
    app.register_blueprint(bookings.bp, url_prefix='/api/bookings')
    app.register_blueprint(collaborations.bp, url_prefix='/api/collaborations')
    app.register_blueprint(reviews.bp, url_prefix='/api/reviews')
    app.register_blueprint(messages.bp, url_prefix='/api/messages')
    app.register_blueprint(notifications.bp, url_prefix='/api/notifications')
    app.register_blueprint(analytics.bp, url_prefix='/api/analytics')
    app.register_blueprint(categories.bp, url_prefix='/api/categories')
    app.register_blueprint(wallet.bp, url_prefix='/api')
    app.register_blueprint(brand_wallet.bp)  # Brand wallet routes at /api/brand/wallet
    app.register_blueprint(admin.bp, url_prefix='/api/admin')  # Admin routes at /api/admin/*

    # Serve uploaded files
    from flask import send_from_directory
    import os

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        """Serve uploaded files"""
        upload_dir = os.path.join(app.root_path, '..', 'uploads')
        return send_from_directory(upload_dir, filename)

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'BantuBuzz API is running'}

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'error': 'Internal server error'}, 500

    # Register Socket.IO handlers
    with app.app_context():
        from . import socket_handlers

    return app
