from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from ..core.function import commit_or_raise
from ..models import Espace, Membre
from ..schemas import EspaceCreate, EspaceUpdate, MembreCreate, WorkspaceMemberUpdate


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

def invite_member_to_espace(db: Session, espace_id: str, user_id: str, role: str) -> Membre:
    """Crée ou met à jour un membre avec le statut 'En attente'."""
    membre = get_espace_member(db, espace_id, user_id)
    if membre:
        membre.role = role
        membre.statut = "En attente"
        commit_or_raise(
            db,
            detail="Impossible de mettre cette invitation a jour.",
            refresh_instance=membre,
        )
        return membre

    return add_member_to_espace(
        db,
        espace_id,
        MembreCreate(
            id_utilisateur=user_id,
            id_espace=espace_id,
            role=role,
            statut="En attente",
        ),
    )


def accept_espace_invitation(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    """Passe le statut d'une invitation de 'En attente' à 'Actif'."""
    membre = get_espace_member(db, espace_id, user_id)
    if not membre or membre.statut != "En attente":
        return None

    membre.statut = "Actif"
    commit_or_raise(
        db,
        detail="Impossible d'accepter cette invitation a l'espace.",
        refresh_instance=membre,
    )
    return membre
