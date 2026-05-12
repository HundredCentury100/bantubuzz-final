#!/usr/bin/env python
"""
Celery Worker Entry Point

Run this script to start the Celery worker:
    celery -A celery_worker.celery worker --loglevel=info

Run Celery Beat for periodic tasks:
    celery -A celery_worker.celery beat --loglevel=info

Or run both together:
    celery -A celery_worker.celery worker --beat --loglevel=info
"""
from app import create_app
from app.celery_app import make_celery

# Create Flask app
flask_app = create_app()

# Create Celery instance with Flask app context
celery = make_celery(flask_app)

if __name__ == '__main__':
    celery.start()
