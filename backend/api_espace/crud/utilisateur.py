from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from ..core.utils import commit_or_raise
from ..core.security import create_access_token, decode_invitation_token
from ..models import Espace, Membre, Utilisateur
from ..schemas import (
    EspaceCreate,
    EspaceUpdate,
    MembreCreate,
    WorkspaceMemberUpdate,
    WorkspaceMemberInvite,
)
from datetime import timedelta


def get_espace_by_id(db: Session, espace_id: str) -> Optional[Espace]:
    return db.query(Espace).filter(Espace.id == espace_id).first()


def get_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    return db.query(Espace).filter(Espace.id_workspace == workspace_id).all()


def get_root_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    """Récupère les espaces de premier niveau d'un workspace (sans parent)."""
    return (
        db.query(Espace)
        .filter(Espace.id_workspace == workspace_id, Espace.id_espace_parent == None)
        .all()
    )


def get_sub_espaces_for_parent(db: Session, parent_id: str) -> List[Espace]:
    """Récupère les sous-espaces directs d'un espace parent."""
    return db.query(Espace).filter(Espace.id_espace_parent == parent_id).all()


def get_workspace_espaces_tree(db: Session, workspace_id: str, user_id: Optional[str] = None) -> List[dict]:
    """
    Récupère tout le contenu d'un workspace sous forme d'arborescence.
    Si user_id est fourni et que l'utilisateur n'est pas membre du workspace,
    on ne retourne que les espaces auxquels il a accès directement.
    """
    from collections import defaultdict
    
    query = db.query(Espace).filter(Espace.id_workspace == workspace_id)
    all_espaces = query.all()

    is_workspace_member = True
    visible_ids = {esp.id for esp in all_espaces}

    if user_id:
        ws_member = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif"
        ).first()

        if not ws_member:
            is_workspace_member = False
            esp_memberships = db.query(Membre.id_espace).filter(
                Membre.id_utilisateur == user_id,
                Membre.id_espace != None,
                Membre.statut == "Actif"
            ).all()
            visible_ids = {mid for (mid,) in esp_memberships}

    nodes_by_parent = defaultdict(list)
    roots = []

    for esp in all_espaces:
        if esp.id not in visible_ids:
            continue
        
        if is_workspace_member:
            nodes_by_parent[esp.id_espace_parent].append(esp)
        else:
            if esp.id_espace_parent in visible_ids:
                nodes_by_parent[esp.id_espace_parent].append(esp)
            else:
                roots.append(esp)

    def build_tree(parent_list: List[Espace]) -> List[dict]:
        tree = []
        for esp in parent_list:
            node = {
                "id": esp.id,
                "nom": esp.nom,
                "description": esp.description,
                "created_at": esp.created_at,
                "id_workspace": esp.id_workspace,
                "id_espace_parent": esp.id_espace_parent,
                "sous_espaces": build_tree(nodes_by_parent[esp.id])
            }
            tree.append(node)
        return tree

    if is_workspace_member:
        return build_tree(nodes_by_parent[None])
    else:
        return build_tree(roots)


def get_espaces_where_admin(db: Session, user_id: str) -> List[Espace]:
    """Retourne les espaces où l'utilisateur est Créateur ou Administrateur actif."""
    return (
        db.query(Espace)
        .join(Membre, Espace.id == Membre.id_espace)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.role.in_(["Créateur", "Administrateur"]),
            Membre.statut == "Actif",
        )
        .distinct()
        .order_by(Espace.created_at.desc())
        .all()
    )


def create_espace(db: Session, espace_in: EspaceCreate, creator_user_id: str) -> Espace:
    espace = Espace(
        **espace_in.model_dump(exclude_none=True),
    )
    db.add(espace)
    try:
        db.flush()

        createur = Membre(
            **MembreCreate(
                id_utilisateur=creator_user_id,
                id_espace=espace.id,
                role="Créateur",
                statut="Actif",
            ).model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        )
        db.add(createur)
        commit_or_raise(
            db,
            detail="Impossible de creer l'espace a cause d'une contrainte d'integrite.",
            refresh_instance=espace,
        )
    except Exception:
        db.rollback()
        raise
    return espace


def update_espace(db: Session, espace_id: str, espace_in: EspaceUpdate) -> Optional[Espace]:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    update_data = espace_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(espace, key, value)
    commit_or_raise(
        db,
        detail="Impossible de mettre a jour l'espace a cause d'une contrainte d'integrite.",
        refresh_instance=espace,
    )
    return espace


def _collect_descendant_espace_ids(db: Session, parent_id: str) -> List[str]:
    """Collecte récursivement tous les IDs des sous-espaces descendants."""
    child_ids = [
        eid
        for (eid,) in db.query(Espace.id).filter(Espace.id_espace_parent == parent_id).all()
    ]
    all_ids = list(child_ids)
    for child_id in child_ids:
        all_ids.extend(_collect_descendant_espace_ids(db, child_id))
    return all_ids


def delete_espace(db: Session, espace_id: str) -> bool:
    """Supprime un espace et tous ses sous-espaces descendants (cascade)."""
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return False

    descendant_ids = _collect_descendant_espace_ids(db, espace_id)
    all_espace_ids = [espace_id] + descendant_ids

    if all_espace_ids:
        db.query(Membre).filter(Membre.id_espace.in_(all_espace_ids)).delete(synchronize_session=False)

    for desc_id in reversed(descendant_ids):
        db.query(Espace).filter(Espace.id == desc_id).delete(synchronize_session=False)

    db.delete(espace)
    commit_or_raise(
        db,
        detail="Impossible de supprimer l'espace et ses dependances.",
    )
    return True


def get_espace_member(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_espace == espace_id, Membre.id_utilisateur == user_id)
        .first()
    )


def get_espace_members(db: Session, espace_id: str) -> List[Membre]:
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_espace == espace_id)
        .order_by(Membre.created_at.asc())
        .all()
    )


def add_member_to_espace(db: Session, espace_id: str, membre_in: MembreCreate) -> Membre:
    membre = Membre(
        **membre_in.model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        id_espace=espace_id,
    )
    db.add(membre)
    commit_or_raise(
        db,
        detail="Impossible d'ajouter ce membre a l'espace a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def update_espace_member(
    db: Session,
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    membre = get_espace_member(db, espace_id, user_id)
    if not membre:
        return None
    update_data = membre_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(membre, key, value)
    commit_or_raise(
        db,
        detail="Impossible de mettre a jour ce membre a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def remove_espace_member(db: Session, espace_id: str, user_id: str) -> bool:
    membre = get_espace_member(db, espace_id, user_id)
    if not membre:
        return False
    db.delete(membre)
    commit_or_raise(
        db,
        detail="Impossible de supprimer ce membre de l'espace.",
    )
    return True


def invite_member_to_espace(db: Session, espace_id: str, membre_in: WorkspaceMemberInvite) -> dict:
    """
    Invite un utilisateur a un espace.
    """
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve.")

    query = db.query(Utilisateur)
    if membre_in.email:
        query = query.filter(Utilisateur.email == membre_in.email)
    else:
        query = query.filter(Utilisateur.username == membre_in.username)
    
    target_user = query.first()

    TOKEN_TYPE = "espace_invitation"

    if target_user:
        membre = get_espace_member(db, espace_id, target_user.id)
        if membre:
            membre.role = membre_in.role
            if membre.statut != "Actif":
                membre.statut = "En attente"
        else:
            membre = Membre(
                id_utilisateur=target_user.id,
                id_espace=espace_id,
                role=membre_in.role,
                statut="En attente",
            )
            db.add(membre)
        
        db.commit()
        db.refresh(membre)
        
        token = create_access_token(
            data={
                "sub": target_user.id,
                "email": target_user.email,
                "workspace_id": espace.id_workspace,
                "espace_id": espace_id,
                "role": membre_in.role,
                "type": TOKEN_TYPE
            },
            expires_delta=timedelta(days=7),
        )
        return {"membre": membre, "invitation_token": token}
    
    else:
        if not membre_in.email:
            raise HTTPException(
                status_code=400, 
                detail="Email obligatoire pour inviter un utilisateur non inscrit."
            )

        token = create_access_token(
            data={
                "email": membre_in.email,
                "workspace_id": espace.id_workspace,
                "espace_id": espace_id,
                "role": membre_in.role,
                "type": TOKEN_TYPE,
            },
            expires_delta=timedelta(days=4),
        )
        return {"token": token}


def accept_espace_invitation(
    db: Session, 
    espace_id: Optional[str], 
    user_id: str,
    invitation_token: str
) -> Membre:
    """
    Accepte une invitation a un espace via token JWT.
    """
    payload = decode_invitation_token(invitation_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expire.")

    token_type = payload.get("type")
    token_scope = payload.get("scope")
    is_standard_invitation = token_type == "espace_invitation"
    is_existing_user_legacy_invitation = token_scope == "espace_invitation_accept"

    if not is_standard_invitation and not is_existing_user_legacy_invitation:
        raise HTTPException(status_code=403, detail="Type de token invalide pour cette action.")

    target_espace_id = espace_id or payload.get("espace_id")
    if not target_espace_id:
        raise HTTPException(status_code=400, detail="ID de l'espace absent du token.")

    espace = get_espace_by_id(db, target_espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="L'espace cible n'existe plus.")

    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve.")

    token_sub = payload.get("sub")
    token_email = payload.get("email")

    if token_sub and token_sub != user_id:
        raise HTTPException(status_code=403, detail="Cette invitation appartient a un autre utilisateur.")
    
    if token_email and token_email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Cet email d'invitation ne correspond pas au votre.")

    workspace_id = payload.get("workspace_id") or espace.id_workspace
    if workspace_id:
        ws_member = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id
        ).first()
        
        if ws_member:
            if ws_member.statut != "Actif":
                ws_member.statut = "Actif"
            if not ws_member.role:
                ws_member.role = "Invité"
        else:
            new_ws_member = Membre(
                id_utilisateur=user_id,
                id_workspace=workspace_id,
                role="Invité",
                statut="Actif"
            )
            db.add(new_ws_member)

    existing_member = get_espace_member(db, target_espace_id, user_id)
    if existing_member:
        if payload.get("role"):
            existing_member.role = payload.get("role")
        if existing_member.statut != "Actif":
            existing_member.statut = "Actif"
        db.commit()
        db.refresh(existing_member)
        return existing_member

    role_from_payload = payload.get("role")
    new_member = Membre(
        id_utilisateur=user_id,
        id_espace=target_espace_id,
        role=role_from_payload if role_from_payload else "Membre",
        statut="Actif"
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return new_member