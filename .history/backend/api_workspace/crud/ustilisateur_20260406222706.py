from typing import List, Optional
from sqlalchemy.orm import Session

from datetime import datetime
from ..core.function import generate_unique_id
from ..models import Membre, Workspace


def get_workspace_by_id(db: Session, workspace_id: str) -> Optional[Workspace]:
    return db.query(Workspace).filter(Workspace.id == workspace_id).first()


def get_workspaces_for_user(db: Session, user_id: str) -> List[Workspace]:
    return (
        db.query(Workspace)
        .join(Membre, Workspace.id == Membre.id_workspace)
        .filter(Membre.id_utilisateur == user_id)
        .all()
    )


def create_workspace(db: Session, nom: str, description: str, user_id: str) -> Workspace:
    workspace = Workspace(
        id=generate_unique_id(db, Workspace),
        nom=nom,
        description=description,
        id_utilisateur=user_id,
    )
    db.add(workspace)
    db.flush()

    createur = Membre(
        id=generate_unique_id(db, Membre),
        id_utilisateur=user_id,
        id_workspace=workspace.id,
        role="Créateur",
        statut="Actif",
    )
    db.add(createur)
    db.commit()
    db.refresh(workspace)
    return workspace


def update_workspace(db: Session, workspace_id: str, nom: str = None, description: str = None) -> Optional[Workspace]:
    workspace = get_workspace_by_id(db, workspace_id)
    if workspace:
        if nom is not None:
            workspace.nom = nom
        if description is not None:
            workspace.description = description
        workspace.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(workspace)
    return workspace


def delete_workspace(db: Session, workspace_id: str) -> bool:
    workspace = get_workspace_by_id(db, workspace_id)
    if workspace:
        db.delete(workspace)
        db.commit()
        return True
    return False


def get_member(db: Session, workspace_id: str, user_id: str) -> Optional[Membre]:
    return (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
        )
        .first()
    )


def get_members_of_workspace(db: Session, workspace_id: str) -> List[Membre]:
    return db.query(Membre).filter(Membre.id_workspace == workspace_id).all()


def add_member_to_workspace(
    db: Session,
    workspace_id: str,
    user_id: str,
    role: str,
    statut: str = "Actif",
) -> Membre:
    membre = Membre(
        id=generate_unique_id(db, Membre),
        id_utilisateur=user_id,
        id_workspace=workspace_id,
        role=role,
        statut=statut,
    )
    db.add(membre)
    db.commit()
    db.refresh(membre)
    return membre


def update_member_role(
    db: Session,
    workspace_id: str,
    user_id: str,
    role: str = None,
    statut: str = None,
) -> Optional[Membre]:
    membre = get_member(db, workspace_id, user_id)
    if membre:
        if role is not None:
            membre.role = role
        if statut is not None:
            membre.statut = statut
        db.commit()
        db.refresh(membre)
    return membre


def remove_member_from_workspace(db: Session, workspace_id: str, user_id: str) -> bool:
    membre = get_member(db, workspace_id, user_id)
    if membre:
        db.delete(membre)
        db.commit()
        return True
    return False
