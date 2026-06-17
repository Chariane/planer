import os
import logging
import requests
from sqlalchemy import text

logger = logging.getLogger(__name__)

K_CHAT_URL = os.getenv("K_CHAT_URL", "http://localhost:8000")

def _get_group_id_by_resource(db, resource_type: str, resource_id: str):
    row = db.execute(
        text("SELECT id FROM messagerie.groupe WHERE resource_type = :type AND resource_id = :id LIMIT 1"),
        {"type": resource_type, "id": resource_id},
    ).first()
    return row[0] if row else None

def ensure_resource_group(db, resource_type: str, resource_id: str, name: str, creator_id: str, members: list = None):
    existing_group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if existing_group_id:
        return existing_group_id
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/create-group",
            json={"name": name, "creator": creator_id, "members": members or [], "resource_type": resource_type, "resource_id": resource_id},
            timeout=5
        )
        if response.status_code == 200:
            return response.json().get("group_id")
    except Exception as e:
        logger.error(f"Error creating K-Chat group: {e}")
    return None

def sync_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, role: str = "member"):
    """
    Synchronise un membre vers K-Messenger.
    
    Args:
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
              → Converti en rôle K-Messenger ("admin", "member", "guest")
    """
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        ensure_resource_group(db, resource_type, resource_id, name, creator_id, members=[creator_id, user_id])
        return
    
    # ✅ Conversion des rôles K-Planner → K-Messenger
    if role in ["Créateur", "Administrateur"]:
        messenger_role = "admin"  # ✅ Changé de "administrator" à "admin"
    elif role == "Invité":
        messenger_role = "guest"
    else:
        messenger_role = "member"
    
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/group/{group_id}/add-member",
            json={"user_id": user_id, "actor": creator_id, "role": messenger_role},
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"✅ Membre {user_id} ajouté au groupe {group_id} avec rôle {messenger_role} (source: {role})")
        else:
            logger.warning(f"⚠️ Erreur K-Messenger: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error adding member to K-Chat group: {e}")

def remove_resource_member(db, resource_type: str, resource_id: str, user_id: str, actor_id: str = None):
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        return
    try:
        if not actor_id:
            row = db.execute(text("SELECT creator FROM messagerie.groupe WHERE id = :group_id"), {"group_id": group_id}).first()
            actor_id = row[0] if row else user_id
        requests.delete(
            f"{K_CHAT_URL}/group/group/{group_id}/remove-member",
            json={"user_id": user_id, "actor": actor_id},
            timeout=5
        )
    except Exception as e:
        logger.error(f"Error removing member from K-Chat group: {e}")
