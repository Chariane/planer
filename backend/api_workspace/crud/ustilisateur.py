from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from ..core.function import generate_unique_id
from ..models import Membre, Workspace
from ..schemas import MembreCreate, MembreUpdate, WorkspaceCreate, WorkspaceMemberInvite, WorkspaceUpdate


def get_workspace_by_id(db: Session, workspace_id: str) -> Optional[Workspace]:
    return db.query(Workspace).filter(Workspace.id == workspace_id).first()


def get_workspaces_for_user(db: Session, user_id: str) -> List[Workspace]:
    return (
        db.query(Workspace)
        .join(Membre, Workspace.id == Membre.id_workspace)
        .filter(Membre.id_utilisateur == user_id)
        .all()
    )


def create_workspace(db: Session, workspace_in: WorkspaceCreate, user_id: str) -> Workspace:
    workspace_data = workspace_in.model_dump(exclude={"id_utilisateur"}, exclude_none=True)
    workspace = Workspace(
        **workspace_data,
        id=generate_unique_id(db, Workspace),
        id_utilisateur=user_id,
    )
    db.add(workspace)
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
    createur = Membre(
        **createur_data,
        id=generate_unique_id(db, Membre),
    )
    db.add(createur)
    db.commit()
    db.refresh(workspace)
    return workspace


def update_workspace(db: Session, workspace_id: str, workspace_in: WorkspaceUpdate) -> Optional[Workspace]:
    workspace = get_workspace_by_id(db, workspace_id)
    if workspace:
        update_data = workspace_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(workspace, key, value)
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
    membre_in: WorkspaceMemberInvite,
) -> Membre:
    membre_data = membre_in.model_dump(exclude_none=True)
    membre = Membre(
        **membre_data,
        id=generate_unique_id(db, Membre),
        id_workspace=workspace_id,
    )
    db.add(membre)
    db.commit()
    db.refresh(membre)
    return membre


def update_member_role(
    db: Session,
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
) -> Optional[Membre]:
    membre = get_member(db, workspace_id, user_id)
    if membre:
        update_data = membre_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(membre, key, value)
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
