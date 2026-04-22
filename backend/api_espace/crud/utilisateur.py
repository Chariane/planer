from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from ..core.function import commit_or_raise
from ..core.security import create_access_token, decode_invitation_token
from ..models import Espace, Membre, Utilisateur
from ..schemas import (
    EspaceCreate,
    EspaceUpdate,
    MembreCreate,
    WorkspaceMemberUpdate,
    WorkspaceMemberInvite,
)


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


def get_workspace_espaces_tree(db: Session, workspace_id: str) -> List[dict]:
    """
    Récupère tout le contenu d'un workspace sous forme d'arborescence.
    Associe les racines et les sous-espaces de manière récursive.
    """
    # 1. Récupérer tous les espaces du workspace pour éviter N+1 requêtes
    all_espaces = db.query(Espace).filter(Espace.id_workspace == workspace_id).all()
    
    # 2. Organiser par parent_id
    from collections import defaultdict
    nodes_by_parent = defaultdict(list)
    for esp in all_espaces:
        nodes_by_parent[esp.id_espace_parent].append(esp)

    # 3. Fonction récursive pour construire l'arbre
    def build_tree(parent_id: Optional[str]) -> List[dict]:
        tree = []
        for esp in nodes_by_parent[parent_id]:
            node = {
                "id": esp.id,
                "nom": esp.nom,
                "description": esp.description,
                "created_at": esp.created_at,
                "id_workspace": esp.id_workspace,
                "id_espace_parent": esp.id_espace_parent,
                "sous_espaces": build_tree(esp.id)
            }
            tree.append(node)
        return tree

    return build_tree(None)


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

    # Collecter tous les IDs descendants (enfants, petits-enfants, etc.)
    descendant_ids = _collect_descendant_espace_ids(db, espace_id)
    all_espace_ids = [espace_id] + descendant_ids

    # Supprimer les membres de tous les espaces concernés
    if all_espace_ids:
        db.query(Membre).filter(Membre.id_espace.in_(all_espace_ids)).delete(synchronize_session=False)

    # Supprimer les sous-espaces descendants (du plus profond au plus haut)
    for desc_id in reversed(descendant_ids):
        db.query(Espace).filter(Espace.id == desc_id).delete(synchronize_session=False)

    # Supprimer l'espace parent
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

def invite_member_to_espace(
    db: Session,
    espace_id: str,
    membre_in: WorkspaceMemberInvite,
) -> dict:
    """Invite un membre dans un espace (existant ou guest via JWT)."""
    # 1. Rechercher l'utilisateur par email ou username
    query = db.query(Utilisateur)
    if membre_in.email:
        query = query.filter(Utilisateur.email == membre_in.email)
    else:
        query = query.filter(Utilisateur.username == membre_in.username)
    
    target_user = query.first()

    if target_user:
        # CAS 1 : L'utilisateur existe déjà
        membre = get_espace_member(db, espace_id, target_user.id)
        if membre:
            membre.role = membre_in.role
            membre.statut = "En attente"
        else:
            membre = Membre(
                id_utilisateur=target_user.id,
                id_espace=espace_id,
                role=membre_in.role,
                statut="En attente",
            )
            db.add(membre)
        
        commit_or_raise(
            db,
            detail="Impossible d'inviter cet utilisateur a l'espace.",
            refresh_instance=membre,
        )
        
        # Générer un token d'acceptation classique pour l'email
        from datetime import timedelta
        token = create_access_token(
            {
                "sub": target_user.id,
                "espace_id": espace_id,
                "scope": "espace_invitation_accept",
            },
            expires_delta=timedelta(days=7),
        )
        return {"membre": membre, "invitation_token": token}
    
    else:
        # CAS 2 : L'utilisateur n'existe pas encore -> Invitation par JWT
        if not membre_in.email:
            raise HTTPException(
                status_code=404, 
                detail="Utilisateur non trouve. Fournissez un email pour inviter un nouvel utilisateur."
            )
            
        from datetime import timedelta
        token = create_access_token(
            {
                "email": membre_in.email,
                "espace_id": espace_id,
                "role": membre_in.role,
                "type": "espace_invitation",
            },
            expires_delta=timedelta(days=4),
        )
        return {"token": token}


def accept_espace_invitation(
    db: Session, 
    espace_id: str, 
    user_id: str,
    invitation_token: str = None,
) -> Optional[Membre]:
    """Accepte une invitation (classique ou via JWT guest)."""
    
    # CAS 1 : Invitation classique (déjà en base)
    membre = get_espace_member(db, espace_id, user_id)
    
    if membre:
        if membre.statut != "En attente":
            return None
        
        membre.statut = "Actif"
        commit_or_raise(
            db,
            detail="Impossible d'accepter cette invitation a l'espace.",
            refresh_instance=membre,
        )
        return membre

    # CAS 2 : Invitation via token JWT (pour un utilisateur qui vient de s'inscrire)
    if not invitation_token:
        return None

    payload = decode_invitation_token(invitation_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expiré.")

    if payload.get("espace_id") != espace_id:
        raise HTTPException(status_code=403, detail="Ce token ne correspond pas à cet espace.")

    # Vérifier que l'email du token correspond bien à l'utilisateur connecté
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user or user.email != payload.get("email"):
        raise HTTPException(status_code=403, detail="Ce token ne vous est pas destiné.")

    # Créer le membre directement comme Actif
    return add_member_to_espace(
        db,
        espace_id,
        MembreCreate(
            id_utilisateur=user_id,
            id_espace=espace_id,
            role=payload.get("role") or "Membre",
            statut="Actif",
        ),
    )
