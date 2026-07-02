from app.celery_app import celery
from app import create_app


@celery.task(name='app.tasks.bulk_brief_tasks.send_due_bulk_briefs')
def send_due_bulk_briefs():
    app = create_app()
    with app.app_context():
        from app.services.bulk_brief_service import send_due_bulk_briefs as send_due
        return send_due()


@celery.task(name='app.tasks.bulk_brief_tasks.sync_bulk_brief_responses')
def sync_bulk_brief_responses():
    app = create_app()
    with app.app_context():
        from app.services.bulk_brief_service import sync_response_tracking
        sync_response_tracking()
        return True
