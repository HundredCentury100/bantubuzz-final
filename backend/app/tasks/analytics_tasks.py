"""
Analytics update background tasks.

These tasks handle periodic updates of cached analytics data.
"""
from app.celery_app import celery
from app.services.thunzi_service import ThunziAIService
from app.models import CreatorProfile
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

        thunzi_service = ThunziAIService()

        # Fetch and cache platform analytics
        analytics = thunzi_service.get_creator_analytics(creator_id)

        logger.info(f"Successfully updated analytics for creator {creator_id}")
        return {
            'status': 'success',
            'creator_id': creator_id,
            'platforms': len(analytics.get('platforms', [])) if analytics else 0
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
