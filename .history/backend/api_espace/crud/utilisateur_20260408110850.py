from typing import List, Optional
from sqlalchemy.orm import Session
from ..core.function import generate_unique_id
from ..models import Espace, Membre
from ..schemas import EspaceCreate, EspaceUpdate, MembreCreate, WorkspaceMemberUpdate


def get_espace_by_id(db: Session, espace_id: str) -> Optional[Espace]:
    return db.query(Espace).filter(Espace.id == espace_id).first()


def get_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    return db.query(Espace).filter(Espace.id_workspace == workspace_id).all()


def create_espace(db: Session, espace_in: EspaceCreate, creator_user_id: str) -> Espace:
    espace = Espace(
        **espace_in.model_dump(exclude_none=True),
        id=generate_unique_id(db, Espace),
    )
    db.add(espace)
    db.flush()
    
    createur = Membre(
        **MembreCreate(
            id_utilisateur=creator_user_id,
            id_espace=espace.id,
            role="Créateur",
            statut="Actif",
        ).model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        id=generate_unique_id(db, Membre),
    )
    db.add(createur)
    db.commit()
    db.refresh(espace)
    return espace


def update_espace(db: Session, espace_id: str, espace_in: EspaceUpdate) -> Optional[Espace]:
    espace = get_espace_by_id(db, espace_id)
    if espace:
        update_data = espace_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(espace, key, value)
        db.commit()
        db.refresh(espace)
    return espace


def delete_espace(db: Session, espace_id: str) -> bool:
    espace = get_espace_by_id(db, espace_id)
    if espace:
        db.delete(espace)
        db.commit()
        return True
    return False


def get_espace_member(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    return (
        db.query(Membre)
        .filter(Membre.id_espace == espace_id, Membre.id_utilisateur == user_id)
        .first()
    )


def get_espace_members(db: Session, espace_id: str) -> List[Membre]:
    return db.query(Membre).filter(Membre.id_espace == espace_id).all()


def add_member_to_espace(db: Session, espace_id: str, membre_in: MembreCreate) -> Membre:
    membre = Membre(
        **membre_in.model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        id=generate_unique_id(db, Membre),
        id_espace=espace_id,
    )
    db.add(membre)
    db.commit()
    db.refresh(membre)
    return membre


def update_espace_member(
    db: Session,
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    membre = get_espace_member(db, espace_id, user_id)
    if membre:
        update_data = membre_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(membre, key, value)
        db.commit()
        db.refresh(membre)
    return membre


def remove_espace_member(db: Session, espace_id: str, user_id: str) -> bool:
    membre = get_espace_member(db, espace_id, user_id)
    if membre:
        db.delete(membre)
        db.commit()
        return True
    return False
