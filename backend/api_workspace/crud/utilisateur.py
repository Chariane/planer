from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from datetime import datetime
from ..core.function import commit_or_raise
from ..models import Membre, Workspace
from ..schemas import MembreCreate, WorkspaceCreate, WorkspaceMemberUpdate, WorkspaceUpdate


def get_workspace_by_id(db: Session, workspace_id: str) -> Optional[Workspace]:
    return (
        db.query(Workspace)
        .options(joinedload(Workspace.membres))
        .filter(Workspace.id == workspace_id)
        .first()
    )


def get_all_workspaces(db: Session, skip: int = 0, limit: int = 100) -> List[Workspace]:
    return db.query(Workspace).offset(skip).limit(limit).all()


def get_owned_workspaces(db: Session, owner_user_id: str) -> List[Workspace]:
    return db.query(Workspace).filter(Workspace.id_utilisateur == owner_user_id).all()


def get_workspaces_for_user(db: Session, user_id: str) -> List[Workspace]:
    return (
        db.query(Workspace)
        .options(joinedload(Workspace.membres))
        .outerjoin(Membre, Workspace.id == Membre.id_workspace)
        .filter(
            or_(
                Workspace.id_utilisateur == user_id,
                Membre.id_utilisateur == user_id,
            )
        )
        .distinct()
        .order_by(Workspace.created_at.desc())
        .all()
    )


def create_workspace(db: Session, workspace_in: WorkspaceCreate, user_id: str) -> Workspace:
    workspace_data = workspace_in.model_dump(exclude={"id_utilisateur"}, exclude_none=True)
    workspace = Workspace(
        **workspace_data,
        id_utilisateur=user_id,
    )
    db.add(workspace)
    try:
        db.flush()

        createur_in = MembreCreate(
            id_utilisateur=user_id,
            id_workspace=workspace.id,
            role="Créateur",
            statut="Actif",
        )
        createur_data = createur_in.model_dump(
            exclude={"id_espace", "id_liste", "id_tache"},
            exclude_none=True,
        )
        createur = Membre(**createur_data)
        db.add(createur)
        commit_or_raise(
            db,
            detail="Impossible de creer le workspace a cause d'une contrainte d'integrite.",
            refresh_instance=workspace,
        )
    except Exception:
        db.rollback()
        raise
    return workspace


def update_workspace(db: Session, workspace_id: str, workspace_in: WorkspaceUpdate) -> Optional[Workspace]:
    workspace = get_workspace_by_id(db, workspace_id)
    if workspace:
        update_data = workspace_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(workspace, key, value)
        workspace.updated_at = datetime.utcnow()
        commit_or_raise(
            db,
            detail="Impossible de mettre a jour le workspace a cause d'une contrainte d'integrite.",
            refresh_instance=workspace,
        )
    return workspace


def delete_workspace(db: Session, workspace_id: str) -> bool:
    workspace = get_workspace_by_id(db, workspace_id)
    if workspace:
        db.query(Membre).filter(Membre.id_workspace == workspace_id).delete(synchronize_session=False)
        db.delete(workspace)
        commit_or_raise(
            db,
            detail="Impossible de supprimer le workspace a cause d'une contrainte d'integrite.",
        )
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
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_workspace == workspace_id)
        .order_by(Membre.created_at.asc())
        .all()
    )


def add_member_to_workspace(
    db: Session,
    workspace_id: str,
    membre_in: MembreCreate,
) -> Membre:
    membre_data = membre_in.model_dump(exclude_none=True)
    membre = Membre(
        **membre_data,
        id_workspace=workspace_id,
    )
    db.add(membre)
    commit_or_raise(
        db,
        detail="Impossible d'ajouter ce membre au workspace a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def update_member_role(
    db: Session,
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    membre = get_member(db, workspace_id, user_id)
    if membre:
        update_data = membre_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(membre, key, value)
        commit_or_raise(
            db,
            detail="Impossible de mettre a jour ce membre a cause d'une contrainte d'integrite.",
            refresh_instance=membre,
        )
    return membre


def remove_member_from_workspace(db: Session, workspace_id: str, user_id: str) -> bool:
    membre = get_member(db, workspace_id, user_id)
    if membre:
        db.delete(membre)
        commit_or_raise(
            db,
            detail="Impossible de supprimer ce membre a cause d'une contrainte d'integrite.",
        )
        return True
    return False
