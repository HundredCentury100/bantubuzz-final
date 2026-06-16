"""
Analytics update background tasks.

These tasks handle periodic updates of cached analytics data.
"""
from app.celery_app import celery
from app import db
from app.services.thunzi_service import ThunziAIService
from app.models import CreatorProfile, ConnectedPlatform, ThunziAccount
from app.services.creator_score_service import queue_creator_score_recalculation
import logging

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.analytics_tasks.update_creator_analytics')
def update_creator_analytics(creator_id):
    """
    Update analytics cache for a specific creator.

    Args:
        creator_id: ID of the creator

    Returns:
        dict: Update result
    """
    try:
        logger.info(f"Updating analytics for creator {creator_id}")

        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            logger.error(f"Creator {creator_id} not found")
            return {'status': 'error', 'message': 'Creator not found'}

        thunzi_account = ThunziAccount.query.filter_by(user_id=creator.user_id).first()
        if not thunzi_account or not thunzi_account.bantubuzz_id:
            logger.info(f"Creator {creator_id} has no ThunziAI creator identifier yet")
            return {
                'status': 'skipped',
                'creator_id': creator_id,
                'message': 'No ThunziAI creator identifier'
            }

        thunzi_service = ThunziAIService()
        platforms = thunzi_service.get_creator_platforms(thunzi_account.bantubuzz_id)

        updated = 0
        for platform_payload in platforms or []:
            thunzi_platform_id = platform_payload.get('id')
            platform_name = (platform_payload.get('platform') or '').lower()
            query = ConnectedPlatform.query.filter_by(user_id=creator.user_id)
            connected_platform = None
            if thunzi_platform_id:
                connected_platform = query.filter_by(thunzi_platform_id=thunzi_platform_id).first()
            if not connected_platform and platform_name:
                connected_platform = query.filter_by(platform=platform_name).first()
            if not connected_platform:
                continue

            connected_platform.followers = platform_payload.get('followers', connected_platform.followers) or 0
            connected_platform.posts = platform_payload.get('posts', connected_platform.posts) or 0
            connected_platform.is_connected = platform_payload.get('isConnected', connected_platform.is_connected)
            connected_platform.sync_status = thunzi_service._normalize_sync_status(
                platform_payload.get('syncStatus') or connected_platform.sync_status
            )
            connected_platform.update_analytics_from_thunzi(platform_payload)
            updated += 1

        creator.refresh_total_followers()
        db.session.commit()
        queue_creator_score_recalculation(creator.id)

        logger.info(f"Successfully updated analytics for creator {creator_id}")
        return {
            'status': 'success',
            'creator_id': creator_id,
            'platforms': len(platforms or []),
            'updated_platforms': updated
        }

    except Exception as e:
        logger.error(f"Error updating analytics for creator {creator_id}: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'creator_id': creator_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.analytics_tasks.update_all_creator_analytics')
def update_all_creator_analytics():
    """
    Periodic task to update analytics cache for all creators.

    This runs every 4 hours to keep analytics data fresh.

    Returns:
        dict: Summary of update operations
    """
    try:
        logger.info("Starting periodic analytics update for all creators")

        # Get all active creators
        creators = CreatorProfile.query.all()

        logger.info(f"Found {len(creators)} creators to update")

        # Queue analytics update tasks
        tasks = []
        for creator in creators:
            result = update_creator_analytics.delay(creator.id)
            tasks.append({
                'creator_id': creator.id,
                'task_id': result.id
            })

        logger.info(f"Queued {len(tasks)} analytics update tasks")
        return {
            'status': 'success',
            'creators_queued': len(tasks),
            'tasks': tasks
        }

    except Exception as e:
        logger.error(f"Error in periodic analytics update: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e)
        }
