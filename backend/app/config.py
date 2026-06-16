import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://localhost/bantubuzz')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # Mail. Support both Flask-Mail's MAIL_* names and the older SMTP_* aliases
    # used by some background utilities and production environment files.
    MAIL_SERVER = os.getenv('MAIL_SERVER') or os.getenv('SMTP_HOST') or 'smtp.gmail.com'
    MAIL_PORT = int(os.getenv('MAIL_PORT') or os.getenv('SMTP_PORT') or 587)
    MAIL_USE_TLS = (os.getenv('MAIL_USE_TLS') or os.getenv('SMTP_USE_TLS') or 'True').lower() == 'true'
    MAIL_USE_SSL = (os.getenv('MAIL_USE_SSL') or os.getenv('SMTP_USE_SSL') or 'False').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME') or os.getenv('SMTP_USER')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD') or os.getenv('SMTP_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER') or os.getenv('SMTP_FROM') or MAIL_USERNAME or 'noreply@bantubuzz.com'

    # Redis & Celery
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL

    # Paynow
    PAYNOW_INTEGRATION_ID = os.getenv('PAYNOW_INTEGRATION_ID')
    PAYNOW_INTEGRATION_KEY = os.getenv('PAYNOW_INTEGRATION_KEY')
    PAYNOW_RETURN_URL = os.getenv('PAYNOW_RETURN_URL')
    PAYNOW_RESULT_URL = os.getenv('PAYNOW_RESULT_URL')

    # Frontend
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    # Headless CMS bridge
    CMS_INTERNAL_URL = os.getenv('CMS_INTERNAL_URL', 'http://127.0.0.1:3010')
    CONTENT_BRIDGE_SECRET = os.getenv('CONTENT_BRIDGE_SECRET')
    CONTENT_BRIDGE_MAX_SKEW_SECONDS = int(os.getenv('CONTENT_BRIDGE_MAX_SKEW_SECONDS', 300))

    # CORS - Allow multiple origins
    CORS_ORIGINS = [
        FRONTEND_URL,
        'http://bantubuzz.com',
        'https://bantubuzz.com',
        'http://www.bantubuzz.com',
        'https://www.bantubuzz.com',
        'https://app.bantubuzz.com',
        'http://173.212.245.22:8080'
    ]

    # File Upload
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'mp4', 'mov'}

    # Web Push / PWA notifications
    VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
    VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
    VAPID_SUBJECT = os.getenv('VAPID_SUBJECT', 'mailto:noreply@bantubuzz.com')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'postgresql://localhost/bantubuzz_test'


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
