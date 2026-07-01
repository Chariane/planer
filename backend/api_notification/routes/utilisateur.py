from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_active_user
from ..crud.notification import (
    create_notification,
    delete_notification,
    list_notifications,
    mark_all_read,
    mark_notification_read,
    unread_count,
)
from ..schemas import NotificationCreate, NotificationOut, UnreadCountOut, UtilisateurOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def get_my_notifications(
    unread_only: bool = Query(False),
    include_global: bool = Query(False),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return list_notifications(
        db,
        user_id=current_user.id,
        unread_only=unread_only,
        include_global=include_global,
        limit=limit,
    )


@router.get("/unread-count", response_model=UnreadCountOut)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return {"count": unread_count(db, user_id=current_user.id)}


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_my_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    if not current_user.is_admin and not current_user.is_super_admin:
        payload.id_utilisateur = current_user.id
        payload.est_globale = False
    # Passer les champs cible
    return create_notification(
        db,
        payload,
        target_type=payload.target_type,
        target_id=payload.target_id,
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return mark_notification_read(db, notification_id=notification_id, user_id=current_user.id)


@router.patch("/read-all")
def mark_everything_read(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return {"updated": mark_all_read(db, user_id=current_user.id)}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    delete_notification(db, notification_id=notification_id, user_id=current_user.id)
    return None