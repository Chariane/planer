from datetime import date, datetime
import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..schemas import NotificationCreate
from ..realtime import NOTIFICATION_CHANNEL


NOTIFICATION_FIELDS = """
    id,
    type,
    COALESCE(message, 'Notification indisponible') AS message,
    COALESCE(est_lu, false) AS est_lu,
    COALESCE(est_globale, false) AS est_globale,
    date_creation,
    date_modif,
    date_lecture,
    id_utilisateur
"""


def _row_to_dict(row: Any) -> dict:
    return dict(row._mapping)


def _json_default(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _emit_notification_created(db: Session, notification: dict) -> None:
    db.execute(
        text("SELECT pg_notify(:channel, :payload)"),
        {
            "channel": NOTIFICATION_CHANNEL,
            "payload": json.dumps(
                {
                    "event": "notification.created",
                    "notification": notification,
                },
                default=_json_default,
            ),
        },
    )


def create_notification(db: Session, payload: NotificationCreate) -> dict:
    if not payload.est_globale and not payload.id_utilisateur:
        raise HTTPException(status_code=400, detail="Une notification non globale doit cibler un utilisateur.")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Le message de notification est obligatoire.")

    row = db.execute(
        text(
            f"""
            INSERT INTO notification.notification (id_utilisateur, type, message, est_lu, est_globale)
            VALUES (:user_id, :type, :message, false, :est_globale)
            RETURNING {NOTIFICATION_FIELDS}
            """
        ),
        {
            "user_id": payload.id_utilisateur,
            "type": payload.type,
            "message": message,
            "est_globale": payload.est_globale,
        },
    ).first()
    notification = _row_to_dict(row)
    _emit_notification_created(db, notification)
    db.commit()
    return notification


def list_notifications(
    db: Session,
    *,
    user_id: str,
    unread_only: bool = False,
    include_global: bool = False,
    limit: int = 30,
) -> list[dict]:
    conditions = ["id_utilisateur = :user_id"]
    if include_global:
        conditions = ["(id_utilisateur = :user_id OR est_globale IS TRUE)"]
    if unread_only:
        conditions.append("COALESCE(est_lu, false) IS FALSE")

    where_clause = " AND ".join(conditions)
    rows = db.execute(
        text(
            f"""
            SELECT {NOTIFICATION_FIELDS}
            FROM notification.notification
            WHERE {where_clause}
            ORDER BY date_creation DESC NULLS LAST
            LIMIT :limit
            """
        ),
        {
            "user_id": user_id,
            "limit": max(1, min(limit, 100)),
        },
    ).all()
    return [_row_to_dict(row) for row in rows]


def unread_count(db: Session, *, user_id: str) -> int:
    return int(
        db.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM notification.notification
                WHERE id_utilisateur = :user_id
                  AND COALESCE(est_lu, false) IS FALSE
                """
            ),
            {"user_id": user_id},
        ).scalar()
        or 0
    )


def mark_notification_read(db: Session, *, notification_id: str, user_id: str) -> dict:
    row = db.execute(
        text(
            f"""
            UPDATE notification.notification
            SET est_lu = true,
                date_lecture = :now,
                date_modif = :now
            WHERE id = :notification_id
              AND id_utilisateur = :user_id
            RETURNING {NOTIFICATION_FIELDS}
            """
        ),
        {
            "notification_id": notification_id,
            "user_id": user_id,
            "now": datetime.utcnow(),
        },
    ).first()
    if not row:
        db.rollback()
        raise HTTPException(status_code=404, detail="Notification introuvable.")
    db.commit()
    return _row_to_dict(row)


def mark_all_read(db: Session, *, user_id: str) -> int:
    result = db.execute(
        text(
            """
            UPDATE notification.notification
            SET est_lu = true,
                date_lecture = :now,
                date_modif = :now
            WHERE id_utilisateur = :user_id
              AND COALESCE(est_lu, false) IS FALSE
            """
        ),
        {
            "user_id": user_id,
            "now": datetime.utcnow(),
        },
    )
    db.commit()
    return int(result.rowcount or 0)


def delete_notification(db: Session, *, notification_id: str, user_id: str) -> None:
    result = db.execute(
        text(
            """
            DELETE FROM notification.notification
            WHERE id = :notification_id
              AND id_utilisateur = :user_id
            """
        ),
        {
            "notification_id": notification_id,
            "user_id": user_id,
        },
    )
    if not result.rowcount:
        db.rollback()
        raise HTTPException(status_code=404, detail="Notification introuvable.")
    db.commit()
