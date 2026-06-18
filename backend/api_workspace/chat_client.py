import os
import logging
import requests
from sqlalchemy import text
from typing import List, Tuple, Optional

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


def _convert_role_to_messenger(role: str) -> str:
    """Convertit un rôle K-Planner en rôle K-Messenger."""
    if role in ["Créateur", "Administrateur"]:
        return "admin"
    elif role == "Invité":
        return "guest"
    else:
        return "member"


def _sync_single_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, messenger_role: str):
    """Synchronise un utilisateur sur un seul groupe de ressource."""
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


def _get_child_resources(db, resource_type: str, resource_id: str) -> List[Tuple[str, str, str, str]]:
    """
    Récupère toutes les ressources enfants d'une ressource donnée.
    Retourne une liste de tuples (type, id, nom, creator_id).
    """
    children = []
    
    if resource_type == "workspace":
        # 1. Espaces du workspace
        espaces = db.execute(
            text("""
                SELECT id, nom, id_utilisateur 
                FROM planer.espace 
                WHERE id_workspace = :workspace_id
            """),
            {"workspace_id": resource_id}
        ).all()
        for espace in espaces:
            children.append(("espace", espace[0], espace[1], espace[2]))
            # 2. Sous-espaces récursifs
            children.extend(_get_sub_espaces(db, espace[0]))
        # 3. Listes du workspace (sans espace parent)
        listes = db.execute(
            text("""
                SELECT id, nom, id_utilisateur 
                FROM planer.liste 
                WHERE id_workspace = :workspace_id AND id_espace IS NULL
            """),
            {"workspace_id": resource_id}
        ).all()
        for liste in listes:
            children.append(("liste", liste[0], liste[1], liste[2]))
            
    elif resource_type == "espace":
        # 1. Sous-espaces
        children.extend(_get_sub_espaces(db, resource_id))
        # 2. Listes de l'espace
        listes = db.execute(
            text("""
                SELECT id, nom, id_utilisateur 
                FROM planer.liste 
                WHERE id_espace = :espace_id
            """),
            {"espace_id": resource_id}
        ).all()
        for liste in listes:
            children.append(("liste", liste[0], liste[1], liste[2]))
    
    return children


def _get_sub_espaces(db, parent_id: str) -> List[Tuple[str, str, str, str]]:
    """Récupère récursivement tous les sous-espaces d'un espace parent."""
    results = []
    espaces = db.execute(
        text("""
            SELECT id, nom, id_utilisateur 
            FROM planer.espace 
            WHERE id_espace_parent = :parent_id
        """),
        {"parent_id": parent_id}
    ).all()
    for espace in espaces:
        results.append(("espace", espace[0], espace[1], espace[2]))
        results.extend(_get_sub_espaces(db, espace[0]))
    return results


def sync_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, role: str = "member", cascade: bool = False):
    """
    Synchronise un membre vers K-Messenger.
    
    Args:
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
              → Converti en rôle K-Messenger ("admin", "member", "guest")
        cascade: Si True, synchronise aussi sur toutes les ressources enfants
    """
    messenger_role = _convert_role_to_messenger(role)
    
    # 1. Synchroniser sur la ressource cible
    _sync_single_resource_member(
        db, resource_type, resource_id, user_id, name, creator_id, messenger_role
    )
    
    # 2. Si cascade=True, synchroniser sur toutes les ressources enfants
    if cascade:
        children = _get_child_resources(db, resource_type, resource_id)
        for child_type, child_id, child_name, child_creator_id in children:
            _sync_single_resource_member(
                db, child_type, child_id, user_id, child_name, child_creator_id, messenger_role
            )


def remove_resource_member(db, resource_type: str, resource_id: str, user_id: str, actor_id: str = None, cascade: bool = False):
    """
    Retire un membre d'un groupe de ressource K-Messenger.
    
    Args:
        cascade: Si True, retire aussi de toutes les ressources enfants
    """
    # 1. Retirer de la ressource cible
    _remove_single_resource_member(db, resource_type, resource_id, user_id, actor_id)
    
    # 2. Si cascade=True, retirer de toutes les ressources enfants
    if cascade:
        children = _get_child_resources(db, resource_type, resource_id)
        for child_type, child_id, _, _ in children:
            _remove_single_resource_member(db, child_type, child_id, user_id, actor_id)


def _remove_single_resource_member(db, resource_type: str, resource_id: str, user_id: str, actor_id: str = None):
    """Retire un utilisateur d'un seul groupe de ressource."""
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


# ✅ NOUVELLE FONCTION : Garantir qu'un utilisateur est membre du groupe d'un workspace
def ensure_chat_group_for_user(db, resource_type: str, resource_id: str, user_id: str, role: str = "Membre"):
    """
    Garantit qu'un utilisateur est membre du groupe de discussion d'un workspace.
    Si le groupe n'existe pas, il est créé.
    Si l'utilisateur n'est pas membre, il est ajouté.
    
    Args:
        resource_type: Type de la ressource (doit être "workspace")
        resource_id: ID du workspace
        user_id: ID de l'utilisateur
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
    """
    if resource_type != "workspace":
        logger.warning(f"ensure_chat_group_for_user appelé avec resource_type={resource_type} mais ne gère que 'workspace'")
        return None
    
    # Récupérer les informations du workspace
    resource_name = None
    creator_id = None
    
    from .crud.utilisateur import get_workspace_by_id
    workspace = get_workspace_by_id(db, resource_id)
    if workspace:
        resource_name = workspace.nom
        creator_id = workspace.id_utilisateur
    
    if not resource_name:
        resource_name = f"workspace:{resource_id}"
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
        row = db.execute(
            text("SELECT 1 FROM messagerie.groupe_members WHERE id_groupe = :group_id AND member = :user_id"),
            {"group_id": group_id, "user_id": user_id}
        ).first()
        
        if not row:
            messenger_role = _convert_role_to_messenger(role)
            try:
                response = requests.post(
                    f"{K_CHAT_URL}/group/group/{group_id}/add-member",
                    json={"user_id": user_id, "actor": creator_id, "role": messenger_role},
                    timeout=5
                )
                if response.status_code == 200:
                    logger.info(f"✅ Membre {user_id} ajouté au groupe {group_id} via ensure_chat_group_for_user (workspace)")
                else:
                    logger.warning(f"⚠️ Erreur K-Messenger: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"Error adding member to K-Chat group: {e}")
    
    return group_id