"""
Platform synchronization background tasks.

These tasks handle periodic syncing of platform data from ThunziAI
and other social media APIs to keep creator analytics up to date.
"""
from app.celery_app import celery
from app.models import CreatorProfile, ConnectedPlatform
from app.services.thunzi_service import ThunziAIService
from app import db
from datetime import datetime, timedelta
from sqlalchemy import and_
import logging

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.platform_sync.sync_platform')
def sync_platform(platform_id):
    """
    Sync a single platform's data from ThunziAI.

    Args:
        platform_id: ID of the platform to sync

    Returns:
        dict: Sync result with status and data
    """
    try:
        logger.info(f"Starting sync for platform {platform_id}")

        platform = ConnectedPlatform.query.get(platform_id)
        if not platform:
            logger.error(f"Platform {platform_id} not found")
            return {'status': 'error', 'message': 'Platform not found'}

        # Check if platform is connected
        if not platform.is_connected:
            logger.warning(f"Platform {platform_id} is not connected")
            return {'status': 'skipped', 'message': 'Platform not connected'}

        # Initialize ThunziAI service
        thunzi_service = ThunziAIService()

        # Get ThunziAccount to login
        from app.models import ThunziAccount
        thunzi_account = ThunziAccount.query.filter_by(user_id=platform.user_id).first()

        if not thunzi_account:
            logger.error(f"No ThunziAccount found for user {platform.user_id}")
            return {'status': 'error', 'message': 'ThunziAccount not found'}

        # Login to ThunziAI (password is same as email)
        login_success = thunzi_service.login(
            email=thunzi_account.thunzi_email,
            password=thunzi_account.thunzi_email
        )

        if not login_success:
            logger.error(f"Failed to login to ThunziAI for platform {platform_id}")
            return {'status': 'error', 'message': 'ThunziAI login failed'}

        # Sync platform using ThunziAI's async endpoint. The service falls back
        # to the legacy endpoint if the async endpoint is unavailable.
        result = thunzi_service.sync_platform_and_poll(
            platform_id=platform.thunzi_platform_id,
            timeout_seconds=120,
            poll_interval_seconds=5
        )

        if not result.get('success'):
            logger.error(f"Sync failed for platform {platform_id}")
            platform.sync_status = result.get('status', 'failed')
            db.session.commit()
            return {'status': 'error', 'message': 'Platform sync failed'}

        # Fetch latest platform data from ThunziAI and update local cache.
        platforms_data = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)
        updated_platform = next(
            (p for p in platforms_data if p.get('id') == platform.thunzi_platform_id),
            None
        )

        if updated_platform:
            platform.account_name = updated_platform.get('accountName') or platform.account_name
            platform.account_id = updated_platform.get('accountId') or platform.account_id
            platform.account_id_secondary = updated_platform.get('accountIdSecondary') or platform.account_id_secondary
            platform.profile_url = updated_platform.get('profileUrl') or platform.profile_url
            platform.followers = updated_platform.get('followers', platform.followers)
            platform.posts = updated_platform.get('posts', platform.posts)
            platform.sync_status = updated_platform.get('syncStatus') or result.get('status', 'success')
            platform.scopes = updated_platform.get('scopes') or platform.scopes

        platform.last_synced_at = datetime.utcnow()

        creator = CreatorProfile.query.filter_by(user_id=platform.user_id).first()
        if creator:
            creator.refresh_total_followers()

        db.session.commit()

        logger.info(f"Successfully synced platform {platform_id}")
        return {
            'status': 'success',
            'platform_id': platform_id,
            'platform': platform.platform,
            'synced_at': platform.last_synced_at.isoformat(),
            'result': result
        }

    except Exception as e:
        logger.error(f"Error syncing platform {platform_id}: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'platform_id': platform_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.platform_sync.sync_creator_platforms')
def sync_creator_platforms(creator_id):
    """
    Sync all platforms for a specific creator.

    Args:
        creator_id: ID of the creator

    Returns:
        dict: Sync results for all platforms
    """
    try:
        logger.info(f"Starting platform sync for creator {creator_id}")

        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            logger.error(f"Creator {creator_id} not found")
            return {'status': 'error', 'message': 'Creator not found'}

        platforms = ConnectedPlatform.query.filter_by(
            user_id=creator.user_id,
            is_connected=True
        ).all()

        if not platforms:
            logger.info(f"No connected platforms found for creator {creator_id}")
            return {
                'status': 'success',
                'creator_id': creator_id,
                'message': 'No connected platforms to sync',
                'platforms': []
            }

        results = []
        for platform in platforms:
            result = sync_platform.delay(platform.id)
            results.append({
                'platform_id': platform.id,
                'platform': platform.platform,
                'task_id': result.id
            })

        logger.info(f"Queued {len(results)} platform sync tasks for creator {creator_id}")
        return {
            'status': 'success',
            'creator_id': creator_id,
            'platforms_queued': len(results),
            'tasks': results
        }

    except Exception as e:
        logger.error(f"Error syncing creator platforms {creator_id}: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'creator_id': creator_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.platform_sync.sync_all_platforms')
def sync_all_platforms():
    """
    Periodic task to sync all connected platforms across all creators.

    This runs every 4 hours to keep platform data fresh.

    Returns:
        dict: Summary of sync operations
    """
    try:
        logger.info("Starting periodic sync for all platforms")

        # Get all connected platforms that haven't been synced in the last 4 hours
        four_hours_ago = datetime.utcnow() - timedelta(hours=4)

        platforms = ConnectedPlatform.query.filter(
            and_(
                ConnectedPlatform.is_connected == True,
                db.or_(
                    ConnectedPlatform.last_synced_at == None,
                    ConnectedPlatform.last_synced_at < four_hours_ago
                )
            )
        ).all()

        logger.info(f"Found {len(platforms)} platforms to sync")

        # Queue sync tasks for each platform
        tasks = []
        for platform in platforms:
            result = sync_platform.delay(platform.id)
            tasks.append({
                'platform_id': platform.id,
                'platform': platform.platform,
                'user_id': platform.user_id,
                'task_id': result.id
            })

        logger.info(f"Queued {len(tasks)} platform sync tasks")
        return {
            'status': 'success',
            'platforms_queued': len(tasks),
            'tasks': tasks,
            'timestamp': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in periodic platform sync: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery.task(name='app.tasks.platform_sync.cleanup_old_sync_results')
def cleanup_old_sync_results():
    """
    Clean up old Celery task results.

    This runs daily to prevent the results backend from growing too large.

    Returns:
        dict: Cleanup summary
    """
    try:
        logger.info("Starting cleanup of old task results")

        # Celery automatically handles this with result_expires setting
        # This task is mainly for logging and future custom cleanup logic

        logger.info("Cleanup completed")
        return {
            'status': 'success',
            'message': 'Cleanup completed',
            'timestamp': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
