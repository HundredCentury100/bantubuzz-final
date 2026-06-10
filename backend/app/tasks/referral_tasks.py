from app import db
from app.celery_app import celery
from app.services.referral_service import qualify_due_referrals


@celery.task(name='app.tasks.referral_tasks.qualify_due_referrals')
def process_due_referrals():
    qualified = qualify_due_referrals()
    db.session.commit()
    return {'status': 'success', 'qualified': qualified}
