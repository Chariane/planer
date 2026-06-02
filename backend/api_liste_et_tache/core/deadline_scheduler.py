from __future__ import annotations

import logging
import os
import threading

from sqlalchemy import text

from ..crud.notification_events import commit_notification_events, notify_deadline_reminders
from .database import SessionLocal


logger = logging.getLogger(__name__)
ADVISORY_LOCK_NAME = "kplanner_deadline_reminder_scheduler"


def _read_interval_seconds() -> int:
    raw_value = os.getenv("DEADLINE_REMINDER_INTERVAL_SECONDS", "900")
    try:
        value = int(raw_value)
    except ValueError:
        return 900
    return max(value, 60)


class DeadlineReminderScheduler:
    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._interval_seconds = _read_interval_seconds()

    @property
    def interval_seconds(self) -> int:
        return self._interval_seconds

    @property
    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    @property
    def is_enabled(self) -> bool:
        return os.getenv("DEADLINE_REMINDER_ENABLED", "true").lower() not in {"0", "false", "no"}

    def start(self) -> None:
        if not self.is_enabled:
            logger.info("Deadline reminder scheduler disabled by environment.")
            return
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="deadline-reminder-scheduler",
            daemon=True,
        )
        self._thread.start()
        logger.info("Deadline reminder scheduler started every %s seconds.", self._interval_seconds)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        self._thread = None

    def run_once(self) -> dict[str, int]:
        db = SessionLocal()
        try:
            lock_acquired = db.execute(
                text("SELECT pg_try_advisory_lock(hashtext(:lock_name))"),
                {"lock_name": ADVISORY_LOCK_NAME},
            ).scalar()
            if not lock_acquired:
                return {
                    "tasks_scanned": 0,
                    "overdue_tasks": 0,
                    "due_today_tasks": 0,
                    "due_tomorrow_tasks": 0,
                    "notifications_targets": 0,
                    "notifications_created": 0,
                    "skipped_lock": 1,
                }

            stats = notify_deadline_reminders(db)
            commit_notification_events(db)
            return stats
        except Exception:
            db.rollback()
            logger.exception("Deadline reminder scan failed.")
            return {
                "tasks_scanned": 0,
                "overdue_tasks": 0,
                "due_today_tasks": 0,
                "due_tomorrow_tasks": 0,
                "notifications_targets": 0,
                "notifications_created": 0,
                "skipped_lock": 0,
            }
        finally:
            try:
                db.execute(
                    text("SELECT pg_advisory_unlock(hashtext(:lock_name))"),
                    {"lock_name": ADVISORY_LOCK_NAME},
                )
                db.commit()
            except Exception:
                db.rollback()
            db.close()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            stats = self.run_once()
            if any(stats.get(key, 0) for key in ("overdue_tasks", "due_today_tasks", "due_tomorrow_tasks")):
                logger.info("Deadline reminder scan completed: %s", stats)
            self._stop_event.wait(self._interval_seconds)


deadline_reminder_scheduler = DeadlineReminderScheduler()
