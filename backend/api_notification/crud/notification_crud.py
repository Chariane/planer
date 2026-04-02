from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from api_gateway.models import Notification

def create_notification(db: Session, user_id: str, type_notif: str, message: str, est_globale: bool = False) -> Notification:
    notif = Notification(
        type=type_notif,
        message=message,
        est_globale=est_globale,
        id_utilisateur=user_id,
        est_lu=False,
        date_creation=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def get_notifications_for_user(db: Session, user_id: str, skip: int = 0, limit: int = 50, only_unread: bool = False) -> List[Notification]:
    query = db.query(Notification).filter(Notification.id_utilisateur == user_id)
    if only_unread:
        query = query.filter(Notification.est_lu == False)
    return query.order_by(Notification.date_creation.desc()).offset(skip).limit(limit).all()

def mark_as_read(db: Session, notif_id: str, user_id: str) -> bool:
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.id_utilisateur == user_id).first()
    if notif and not notif.est_lu:
        notif.est_lu = True
        notif.date_lecture = datetime.utcnow()
        db.commit()
        return True
    return False

def mark_all_as_read(db: Session, user_id: str) -> int:
    result = db.query(Notification).filter(Notification.id_utilisateur == user_id, Notification.est_lu == False).update({"est_lu": True, "date_lecture": datetime.utcnow()})
    db.commit()
    return result

def delete_notification(db: Session, notif_id: str, user_id: str) -> bool:
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.id_utilisateur == user_id).first()
    if notif:
        db.delete(notif)
        db.commit()
        return True
    return False