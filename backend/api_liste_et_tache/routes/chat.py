from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_user
from ..schemas import UtilisateurOut
from backend.api_liste_et_tache.chat_client import ensure_chat_group_for_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/ensure/{resource_type}/{resource_id}")
async def ensure_chat_group(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """
    Garantit qu'un groupe de discussion existe pour une liste.
    Appelé par le frontend avant d'ouvrir la messagerie.
    """
    if resource_type != "liste":
        raise HTTPException(status_code=400, detail=f"Type de ressource non supporté: {resource_type}")
    
    group_id = ensure_chat_group_for_user(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=current_user.id,
        role="Membre"
    )
    
    if not group_id:
        raise HTTPException(status_code=500, detail="Impossible de créer le groupe de discussion")
    
    return {"success": True, "group_id": group_id}