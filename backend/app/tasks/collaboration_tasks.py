"""
Collaboration-related Celery tasks for BantuBuzz.

Handles:
- 3-day auto-complete for collaborations without content review
- Periodic checks for eligible collaborations
"""
from datetime import datetime, timedelta
from app.celery_app import celery
from app import db
from app.models.collaboration import Collaboration
from app.models.user import User
from app.models.notification import Notification
from sqlalchemy import and_


@celery.task(name='app.tasks.collaboration_tasks.check_auto_complete_eligible')
def check_auto_complete_eligible():
    """
    Check for collaborations eligible for 3-day auto-complete.

    Criteria:
    - requires_content_review = False
    - status = 'in_progress'
    - auto_complete_eligible_at is set and <= now
    - progress_percentage = 100%

    Runs daily via Celery Beat.
    """
    try:
        now = datetime.utcnow()

        # Find eligible collaborations
        eligible_collaborations = Collaboration.query.filter(
            and_(
                Collaboration.requires_content_review == False,
                Collaboration.status == 'in_progress',
                Collaboration.auto_complete_eligible_at != None,
                Collaboration.auto_complete_eligible_at <= now,
                Collaboration.progress_percentage == 100
            )
        ).all()

        completed_count = 0
        for collab in eligible_collaborations:
            try:
                # Mark as completed
                collab.status = 'completed'
                collab.actual_completion_date = now
                collab.last_update = 'Auto-completed after 3-day review period'
                collab.last_update_date = now

                db.session.commit()
                completed_count += 1

                # Notify brand
                if collab.brand_id:
                    brand_user = User.query.filter_by(id=collab.brand_id).first()
                    if brand_user:
                        notification = Notification(
                            user_id=brand_user.id,
                            type='collaboration_completed',
                            title='Collaboration Auto-Completed',
                            message=f'Your collaboration "{collab.title}" has been automatically completed after the 3-day review period.',
                            link=f'/brand/collaborations/{collab.id}'
                        )
                        db.session.add(notification)

                # Notify creator
                if collab.creator_id:
                    creator_user = User.query.filter_by(id=collab.creator_id).first()
                    if creator_user:
                        notification = Notification(
                            user_id=creator_user.id,
                            type='collaboration_completed',
                            title='Collaboration Auto-Completed',
                            message=f'Your collaboration "{collab.title}" has been automatically completed. Payment will be released shortly.',
                            link=f'/creator/collaborations/{collab.id}'
                        )
                        db.session.add(notification)

                db.session.commit()

            except Exception as e:
                db.session.rollback()
                print(f"Error auto-completing collaboration {collab.id}: {str(e)}")
                continue

        print(f"Auto-completed {completed_count} collaborations")
        return {
            'success': True,
            'completed_count': completed_count
        }

    except Exception as e:
        print(f"Error in check_auto_complete_eligible: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@celery.task(name='app.tasks.collaboration_tasks.set_auto_complete_date')
def set_auto_complete_date(collaboration_id):
    """
    Set the auto_complete_eligible_at date for a collaboration.
    Called when all deliverables are submitted.

    Args:
        collaboration_id: ID of the collaboration
    """
    try:
        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return {'success': False, 'error': 'Collaboration not found'}

        # Only set if content review is not required
        if not collab.requires_content_review:
            # Set to 3 days from now
            collab.auto_complete_eligible_at = datetime.utcnow() + timedelta(days=3)
            db.session.commit()

            # Notify brand about 3-day auto-complete
            if collab.brand_id:
                brand_user = User.query.filter_by(id=collab.brand_id).first()
                if brand_user:
                    notification = Notification(
                        user_id=brand_user.id,
                        type='collaboration_update',
                        title='Review Period Started',
                        message=f'All deliverables submitted for "{collab.title}". You have 3 days to review before auto-completion.',
                        link=f'/brand/collaborations/{collab.id}'
                    )
                    db.session.add(notification)
                    db.session.commit()

            return {
                'success': True,
                'auto_complete_at': collab.auto_complete_eligible_at.isoformat()
            }
        else:
            return {
                'success': False,
                'error': 'Content review is required, no auto-complete'
            }

    except Exception as e:
        db.session.rollback()
        print(f"Error setting auto-complete date for collaboration {collaboration_id}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
