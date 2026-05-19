"""
Celery configuration and app instance for BantuBuzz background tasks.
"""
from celery import Celery
from celery.schedules import crontab
import os


def make_celery(app=None):
    """
    Create and configure Celery instance.

    Args:
        app: Flask application instance (optional)

    Returns:
        Celery instance
    """
    # Get Redis URL from environment or use default
    redis_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')

    celery = Celery(
        'bantubuzz',
        broker=redis_url,
        backend=redis_url,
        include=[
            'app.tasks.platform_sync',
            'app.tasks.email_tasks',
            'app.tasks.analytics_tasks',
            'app.tasks.collaboration_tasks'
        ]
    )

    # Configure Celery
    celery.conf.update(
        # Task settings
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Africa/Harare',  # Zimbabwe timezone
        enable_utc=True,

        # Result backend settings
        result_expires=3600,  # Results expire after 1 hour
        result_backend_transport_options={'master_name': 'mymaster'},

        # Worker settings
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,

        # Beat schedule for periodic tasks
        beat_schedule={
            # Sync all platforms every 6 hours
            'sync-all-platforms': {
                'task': 'app.tasks.platform_sync.sync_all_platforms',
                'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
            },
            # Update analytics cache every 4 hours
            'update-analytics-cache': {
                'task': 'app.tasks.analytics_tasks.update_all_creator_analytics',
                'schedule': crontab(minute=30, hour='*/4'),  # Every 4 hours at :30
            },
            # Clean up old results every day at 3 AM
            'cleanup-old-results': {
                'task': 'app.tasks.platform_sync.cleanup_old_sync_results',
                'schedule': crontab(minute=0, hour=3),  # Daily at 3 AM
            },
            # Check and notify inactive users every day at 9 AM
            'notify-inactive-users': {
                'task': 'app.tasks.email_tasks.check_and_notify_inactive_users',
                'schedule': crontab(minute=0, hour=9),  # Daily at 9 AM
            },
            # Check for auto-complete eligible collaborations every day at 10 AM
            'check-auto-complete-collaborations': {
                'task': 'app.tasks.collaboration_tasks.check_auto_complete_eligible',
                'schedule': crontab(minute=0, hour=10),  # Daily at 10 AM
            },
        }
    )

    # Set Flask app context if provided
    if app:
        celery.set_default()

        class ContextTask(celery.Task):
            """Make celery tasks work with Flask app context."""
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)

        celery.Task = ContextTask

    return celery


# Create default Celery instance
celery = make_celery()
