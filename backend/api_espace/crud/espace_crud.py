from sqlalchemy.orm import Session
from typing import List, Optional

# Import absolu depuis api_gateway.models (backend est dans le PYTHONPATH)
from api_gateway.models import Espace, Membre, Workspace


def get_espace_by_id(db: Session, espace_id: str) -> Optional[Espace]:
    return db.query(Espace).filter(Espace.id == espace_id).first()


def get_espaces_in_workspace(db: Session, workspace_id: str, parent_id: Optional[str] = None) -> List[Espace]:
    q = db.query(Espace).filter(Espace.id_workspace == workspace_id)
    if parent_id is None:
        q = q.filter(Espace.id_espace_parent.is_(None))
    else:
        q = q.filter(Espace.id_espace_parent == parent_id)
    return q.all()


def create_espace(db: Session, nom: str, description: str, workspace_id: str, parent_id: Optional[str] = None) -> Espace:
    espace = Espace(
        nom=nom,
        description=description,
        id_workspace=workspace_id,
        id_espace_parent=parent_id
    )
    db.add(espace)
    db.commit()
    db.refresh(espace)
    return espace


def update_espace(db: Session, espace_id: str, nom: str = None, description: str = None) -> Espace:
    espace = get_espace_by_id(db, espace_id)
    if espace:
        if nom is not None:
            espace.nom = nom
        if description is not None:
            espace.description = description
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


# ========== MEMBRES D'ESPACE ==========
def get_space_member(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    return db.query(Membre).filter(
        Membre.id_espace == espace_id,
        Membre.id_utilisateur == user_id
    ).first()


def get_space_members(db: Session, espace_id: str) -> List[Membre]:
    return db.query(Membre).filter(Membre.id_espace == espace_id).all()


def add_member_to_espace(db: Session, espace_id: str, user_id: str, role: str, statut: str = "Actif") -> Membre:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    membre = Membre(
        id_utilisateur=user_id,
        id_workspace=espace.id_workspace,
        id_espace=espace_id,
        role=role,
        statut=statut
    )
    db.add(membre)
    db.commit()
    db.refresh(membre)
    return membre


def update_space_member_role(db: Session, espace_id: str, user_id: str, role: str = None, statut: str = None) -> Membre:
    membre = get_space_member(db, espace_id, user_id)
    if membre:
        if role is not None:
            membre.role = role
        if statut is not None:
            membre.statut = statut
        db.commit()
        db.refresh(membre)
    return membre


def remove_space_member(db: Session, espace_id: str, user_id: str) -> bool:
    membre = get_space_member(db, espace_id, user_id)
    if membre:
        db.delete(membre)
        db.commit()
        return True
    return False