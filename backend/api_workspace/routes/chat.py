from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_user
from ..schemas import UtilisateurOut
from backend.api_workspace.chat_client import ensure_chat_group_for_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/ensure/{resource_type}/{resource_id}")
async def ensure_chat_group(
    request: Request,
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """
    Garantit qu'un groupe de discussion existe pour un workspace.
    Appelé par le frontend avant d'ouvrir la messagerie.
    """
    if resource_type != "workspace":
        raise HTTPException(status_code=400, detail=f"Type de ressource non supporté: {resource_type}")
    
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    group_id = ensure_chat_group_for_user(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=current_user.id,
        role="Membre",
        token=token,
    )
    
    if not group_id:
        raise HTTPException(status_code=500, detail="Impossible de créer le groupe de discussion")
    
    return {"success": True, "group_id": group_id}