from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Notification
from ..schemas import NotificationCreate


def create_notification(db: Session, payload: NotificationCreate) -> Notification:
    if not payload.est_globale and not payload.id_utilisateur:
        raise HTTPException(status_code=400, detail="Une notification non globale doit cibler un utilisateur.")

    notification = Notification(
        id_utilisateur=payload.id_utilisateur,
        type=payload.type,
        message=payload.message.strip(),
        est_globale=payload.est_globale,
        est_lu=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def list_notifications(
    db: Session,
    *,
    user_id: str,
    unread_only: bool = False,
    include_global: bool = False,
    limit: int = 30,
) -> list[Notification]:
    query = db.query(Notification)
    if include_global:
        query = query.filter(or_(Notification.id_utilisateur == user_id, Notification.est_globale.is_(True)))
    else:
        query = query.filter(Notification.id_utilisateur == user_id)
    if unread_only:
        query = query.filter(Notification.est_lu.is_(False))
    return query.order_by(Notification.date_creation.desc()).limit(max(1, min(limit, 100))).all()


def unread_count(db: Session, *, user_id: str) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.id_utilisateur == user_id,
            Notification.est_lu.is_(False),
        )
        .count()
    )


def mark_notification_read(db: Session, *, notification_id: str, user_id: str) -> Notification:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.id_utilisateur == user_id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification introuvable.")

    notification.est_lu = True
    notification.date_lecture = datetime.utcnow()
    notification.date_modif = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session, *, user_id: str) -> int:
    notifications = (
        db.query(Notification)
        .filter(Notification.id_utilisateur == user_id, Notification.est_lu.is_(False))
        .all()
    )
    now = datetime.utcnow()
    for notification in notifications:
        notification.est_lu = True
        notification.date_lecture = now
        notification.date_modif = now
    db.commit()
    return len(notifications)


def delete_notification(db: Session, *, notification_id: str, user_id: str) -> None:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.id_utilisateur == user_id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification introuvable.")
    db.delete(notification)
    db.commit()
