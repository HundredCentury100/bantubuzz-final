from app import db
from app.celery_app import celery
from app.models import CreatorScore
from app.services.creator_score_service import CreatorScoreService


@celery.task(name='app.tasks.creator_score_tasks.recalculate_creator')
def recalculate_creator(creator_profile_id):
    existing = CreatorScore.query.filter_by(creator_profile_id=creator_profile_id).first()
    previous_max = (existing.input_snapshot or {}).get('max_followers') if existing else None
    current_max = CreatorScoreService.max_platform_followers()
    if previous_max is None or int(previous_max or 0) != int(current_max or 0):
        count = CreatorScoreService.recalculate_all()
        db.session.commit()
        return {
            'status': 'success',
            'creator_profile_id': creator_profile_id,
            'creators_calculated': count,
            'full_recalculation': True,
        }

    score = CreatorScoreService.calculate(creator_profile_id, rebuild_ranks=True)
    db.session.commit()
    return {
        'status': 'success',
        'creator_profile_id': creator_profile_id,
        'calculated': bool(score),
        'full_recalculation': False,
    }


@celery.task(name='app.tasks.creator_score_tasks.recalculate_all')
def recalculate_all_creators():
    count = CreatorScoreService.recalculate_all()
    db.session.commit()
    return {'status': 'success', 'creators_calculated': count}
