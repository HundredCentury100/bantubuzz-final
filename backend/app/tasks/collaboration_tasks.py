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
from app.models.milestone_deliverable import MilestoneDeliverable
from app.models.notification import Notification
from app.models.package_deliverable import PackageDeliverable
from app.services.product_notifications import notify_collaboration_completed, notify_creator_delivery_due_soon
from app.services.post_metrics_service import PostMetricsService
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

                notify_collaboration_completed(collab, auto_completed=True)

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


@celery.task(name='app.tasks.collaboration_tasks.send_delivery_due_reminders')
def send_delivery_due_reminders():
    """
    Warn creators 12 hours before expected completion.

    Run this periodically from Celery Beat. It is idempotent because it checks
    for an existing reminder notification for the same collaboration first.
    """
    try:
        now = datetime.utcnow()
        window_end = now + timedelta(hours=12)
        collaborations = Collaboration.query.filter(
            Collaboration.status == 'in_progress',
            Collaboration.expected_completion_date != None,
            Collaboration.expected_completion_date > now,
            Collaboration.expected_completion_date <= window_end,
        ).all()

        sent = 0
        for collab in collaborations:
            creator_user = collab.creator.user if collab.creator else None
            if not creator_user:
                continue
            existing = Notification.query.filter_by(
                user_id=creator_user.id,
                type='collaboration',
                title='Delivery due in 12 hours',
                action_url=f'/creator/collaborations/{collab.id}',
            ).first()
            if existing:
                continue
            notify_creator_delivery_due_soon(collab)
            sent += 1

        return {'success': True, 'sent': sent, 'checked': len(collaborations)}
    except Exception as e:
        print(f"Error sending delivery due reminders: {str(e)}")
        return {'success': False, 'error': str(e)}


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


@celery.task(name='app.tasks.collaboration_tasks.sync_submitted_post_metrics')
def sync_submitted_post_metrics():
    """
    Sync ThunziAI metrics for submitted collaboration post references.

    This replaces the manual Delivery sync button with a background autosync
    that refreshes package and milestone deliverables every four hours.
    """
    try:
        package_deliverables = PackageDeliverable.query.filter(
            PackageDeliverable.post_url_validated == True,
            PackageDeliverable.url.isnot(None),
            PackageDeliverable.url != ''
        ).all()

        milestone_deliverables = MilestoneDeliverable.query.filter(
            MilestoneDeliverable.post_url_validated == True,
            MilestoneDeliverable.url.isnot(None),
            MilestoneDeliverable.url != ''
        ).all()

        synced = 0
        failed = 0

        for deliverable in package_deliverables:
            result = PostMetricsService.sync_deliverable_metrics(deliverable.id, deliverable_type='package')
            if result.get('success'):
                synced += 1
            else:
                failed += 1

        for deliverable in milestone_deliverables:
            result = PostMetricsService.sync_deliverable_metrics(deliverable.id, deliverable_type='milestone')
            if result.get('success'):
                synced += 1
            else:
                failed += 1

        return {
            'success': True,
            'synced': synced,
            'failed': failed,
            'checked': len(package_deliverables) + len(milestone_deliverables),
            'timestamp': datetime.utcnow().isoformat()
        }

    except Exception as e:
        db.session.rollback()
        print(f"Error syncing submitted post metrics: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
