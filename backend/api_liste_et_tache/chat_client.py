import os
import logging
import requests
from sqlalchemy import text

logger = logging.getLogger(__name__)

K_CHAT_URL = os.getenv("K_CHAT_URL", "http://localhost:8000")


def _get_group_id_by_resource(db, resource_type: str, resource_id: str):
    try:
        row = db.execute(
            text("SELECT id FROM messagerie.groupe WHERE resource_type = :type AND resource_id = :id LIMIT 1"),
            {"type": resource_type, "id": str(resource_id)},
        ).first()
        return row[0] if row else None
    except Exception as exc:
        logger.error("Erreur lors de la récupération du groupe de discussion : %s", exc)
        return None


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


def _convert_role_to_messenger(role: str) -> str:
    """Convertit un rôle K-Planner en rôle K-Messenger."""
    if role in ["Créateur", "Administrateur"]:
        return "admin"
    elif role == "Invité":
        return "guest"
    else:
        return "member"


def sync_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, role: str = "member"):
    """
    Synchronise un membre vers K-Messenger.
    
    Args:
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
              → Converti en rôle K-Messenger ("admin", "member", "guest")
    """
    messenger_role = _convert_role_to_messenger(role)
    
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        ensure_resource_group(db, resource_type, resource_id, name, creator_id, members=[creator_id, user_id])
        return
    
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/group/{group_id}/add-member",
            json={"user_id": user_id, "actor": creator_id, "role": messenger_role},
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"✅ Membre {user_id} ajouté au groupe {group_id} avec rôle {messenger_role} (source: {resource_type}:{resource_id})")
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
            row = db.execute(text("SELECT creator FROM messagerie.groupe WHERE id = :group_id"), {"group_id": str(group_id)}).first()
            actor_id = row[0] if row else user_id
        requests.delete(
            f"{K_CHAT_URL}/group/group/{group_id}/remove-member",
            json={"user_id": user_id, "actor": actor_id},
            timeout=5
        )
    except Exception as e:
        logger.error(f"Error removing member from K-Chat group: {e}")


# ✅ NOUVELLE FONCTION : Garantir qu'un utilisateur est membre du groupe d'une ressource
def ensure_chat_group_for_user(db, resource_type: str, resource_id: str, user_id: str, role: str = "Membre"):
    """
    Garantit qu'un utilisateur est membre du groupe de discussion d'une ressource.
    Si le groupe n'existe pas, il est créé.
    Si l'utilisateur n'est pas membre, il est ajouté.
    
    Args:
        resource_type: Type de la ressource (workspace, espace, liste)
        resource_id: ID de la ressource
        user_id: ID de l'utilisateur
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
    """
    # Récupérer les informations de la ressource
    resource_name = None
    creator_id = None
    
    if resource_type == "liste":
        from .crud.liste import get_liste_by_id
        liste = get_liste_by_id(db, resource_id)
        if liste:
            resource_name = liste.nom
            from .models import Membre
            creator = db.query(Membre).filter(
                Membre.id_liste == resource_id,
                Membre.role == "Créateur"
            ).first()
            creator_id = creator.id_utilisateur if creator else user_id
    
    if not resource_name:
        resource_name = f"{resource_type}:{resource_id}"
        creator_id = user_id
    
    # Créer le groupe si nécessaire
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        group_id = ensure_resource_group(
            db,
            resource_type=resource_type,
            resource_id=resource_id,
            name=resource_name,
            creator_id=creator_id,
            members=[creator_id]
        )
    
    # Ajouter l'utilisateur au groupe
    if group_id:
        # Vérifier si l'utilisateur est déjà membre
        try:
            row = db.execute(
                text("SELECT 1 FROM messagerie.groupe_members WHERE id_groupe = :group_id AND member = :user_id"),
                {"group_id": str(group_id), "user_id": str(user_id)}
            ).first()
        except Exception as exc:
            logger.error("Erreur lors de la vérification des membres du groupe : %s", exc)
            row = None
        
        if not row:
            messenger_role = _convert_role_to_messenger(role)
            try:
                response = requests.post(
                    f"{K_CHAT_URL}/group/group/{group_id}/add-member",
                    json={"user_id": user_id, "actor": creator_id, "role": messenger_role},
                    timeout=5
                )
                if response.status_code == 200:
                    logger.info(f"✅ Membre {user_id} ajouté au groupe {group_id} via ensure_chat_group_for_user")
                else:
                    logger.warning(f"⚠️ Erreur K-Messenger: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"Error adding member to K-Chat group: {e}")
    
    return group_id