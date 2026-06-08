import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def update_trending_score_task(moment_id):
    """Async task to update trending score for a moment."""
    from .models import Moment
    
    try:
        moment = Moment.objects.get(pk=moment_id)
        score = (
            moment.likes.count() * 3 +
            moment.views * 0.1 +
            moment.shares * 4
        )
        Moment.objects.filter(pk=moment.pk).update(trending_score=score)
        logger.info(f"[Trending] Updated score for moment {moment_id}: {score}")
    except Moment.DoesNotExist:
        logger.error(f"[Trending] Moment {moment_id} not found for trending update")
    except Exception as e:
        logger.error(f"[Trending] Error updating trending score for moment {moment_id}: {e}")
