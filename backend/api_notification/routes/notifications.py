from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import NotificationOut, NotificationUpdate
from ..security import get_current_user
from ..crud.notification_crud import get_notifications_for_user, mark_as_read, mark_all_as_read, delete_notification, create_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def get_my_notifications(db: Session = Depends(get_db), current_user = Depends(get_current_user), skip: int = 0, limit: int = 50, only_unread: bool = False):
    notifs = get_notifications_for_user(db, current_user.id, skip, limit, only_unread)
    return notifs

@router.put("/{notif_id}/read", response_model=dict)
def mark_notification_read(notif_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if mark_as_read(db, notif_id, current_user.id):
        return {"message": "Notification marquée comme lue"}
    raise HTTPException(status_code=404, detail="Notification non trouvée")

@router.put("/read-all", response_model=dict)
def mark_all_read(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    count = mark_all_as_read(db, current_user.id)
    return {"message": f"{count} notification(s) marquée(s) comme lue(s)"}

@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification_endpoint(notif_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if not delete_notification(db, notif_id, current_user.id):
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    return None

@router.post("/internal", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification_internal(user_id: str, type_notif: str, message: str, est_globale: bool = False, db: Session = Depends(get_db)):
    # Pas de vérification d'authentification, appel interne uniquement
    notif = create_notification(db, user_id, type_notif, message, est_globale)
    # Envoyer en temps réel via WebSocket si l'utilisateur est connecté
    from .websocket import manager
    import asyncio
    asyncio.create_task(manager.send_personal_message(user_id, {"type": "new", "data": {"id": notif.id, "type": notif.type, "message": notif.message}}))
    return notif