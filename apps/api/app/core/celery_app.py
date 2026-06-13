import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "datamind_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

def enqueue_task(task, *args, **kwargs):
    """Safely enqueues a celery task. Falls back to synchronous execution if Redis is offline."""
    try:
        # Check if Redis is online (timeout=1)
        import redis
        r = redis.from_url(REDIS_URL, socket_timeout=1)
        r.ping()
        # If ping succeeds, enqueue asynchronously
        return task.delay(*args, **kwargs)
    except Exception as e:
        print(f"[Queue Fallback] Redis offline or Celery error: {e}. Executing task synchronously.")
        # Execute task synchronously directly
        return task(*args, **kwargs)
