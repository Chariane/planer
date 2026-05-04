# backend/api_liste_et_tache/crud/liste.py
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from ..models import Liste, Membre, Canevas, Section

def get_liste_by_id(db: Session, liste_id: str) -> Optional[Liste]:
    return db.query(Liste).filter(Liste.id == liste_id).first()


def get_listes_for_workspace(db: Session, workspace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_workspace == workspace_id).all()


def get_listes_for_espace(db: Session, espace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_espace == espace_id).all()


def create_liste(db: Session, nom: str, description: str = None, id_espace: str = None, id_workspace: str = None) -> Liste:
    # 1. Créer la liste
    liste = Liste(
        nom=nom, 
        description=description, 
        id_espace=id_espace if id_espace else None, 
        id_workspace=id_workspace if id_workspace else None
    )
    db.add(liste)
    db.flush()  # Pour obtenir l'ID de la liste sans commit final
    
    # 2. Créer le canevas associé (SANS section par défaut)
    canevas = Canevas(
        is_verrouille=False,
        id_liste=liste.id
    )
    db.add(canevas)
    
    # 3. Commit final
    try:
        db.commit()
        db.refresh(liste)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Impossible de creer la liste. Vérifiez que l'id_espace ou id_workspace existe. Erreur: {str(exc)}",
        ) from exc
    
    return liste


def update_liste(db: Session, liste_id: str, **kwargs) -> Optional[Liste]:
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        return None
    
    for key, value in kwargs.items():
        if hasattr(liste, key) and value is not None:
            setattr(liste, key, value)
            
    try:
        db.commit()
        db.refresh(liste)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de mettre a jour la liste.",
        ) from exc
    return liste


def delete_liste(db: Session, liste_id: str) -> bool:
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        return False
    
    # Supprimer d'abord le canevas (cascade devrait le faire, mais par sécurité)
    canevas = db.query(Canevas).filter(Canevas.id_liste == liste_id).first()
    if canevas:
        db.delete(canevas)
    
    db.delete(liste)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la suppression de la liste.",
        )
    return True


def _get_liste_with_scope(db: Session, liste_id: str) -> Optional[Liste]:
    return (
        db.query(Liste)
        .options(joinedload(Liste.espace), joinedload(Liste.workspace))
        .filter(Liste.id == liste_id)
        .first()
    )


def _resolve_workspace_id_from_liste(liste: Liste) -> Optional[str]:
    return liste.id_workspace or (liste.espace.id_workspace if liste.espace else None)


def _promote_active_workspace_guest_to_member(
    db: Session,
    workspace_id: Optional[str],
    utilisateur_id: str,
) -> bool:
    if not workspace_id:
        return False

    workspace_member = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == utilisateur_id,
            Membre.statut == "Actif",
        )
        .first()
    )

    if not workspace_member or workspace_member.role != "Invité":
        return False

    workspace_member.role = "Membre"
    return True


def assign_member_to_liste(db: Session, liste_id: str, utilisateur_id: str) -> Membre:
    """Assigne un utilisateur a une liste et promeut un invite actif en membre si necessaire."""
    liste = _get_liste_with_scope(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste introuvable.")

    workspace_id = _resolve_workspace_id_from_liste(liste)
    promoted_guest = _promote_active_workspace_guest_to_member(db, workspace_id, utilisateur_id)

    existing = (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.id_utilisateur == utilisateur_id,
        )
        .first()
    )

    if existing:
        if promoted_guest:
            try:
                db.commit()
                db.refresh(existing)
            except IntegrityError as exc:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail="Erreur lors de la mise a jour du role du membre assigne a la liste.",
                ) from exc
        return existing

    assignation = Membre(
        id_liste=liste_id,
        id_utilisateur=utilisateur_id,
        role="Membre",
        statut="Actif",
    )
    db.add(assignation)
    try:
        db.commit()
        db.refresh(assignation)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Erreur lors de l'assignation du membre a la liste.",
        ) from exc
    return assignation


def unassign_member_from_liste(db: Session, liste_id: str, utilisateur_id: str) -> bool:
    """Retire l'assignation directe d'un membre sur une liste."""
    assignation = (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.id_utilisateur == utilisateur_id,
        )
        .first()
    )

    if not assignation:
        return False

    db.delete(assignation)
    db.commit()
    return True


def get_liste_members(db: Session, liste_id: str) -> List[Membre]:
    """Recupere tous les membres assignes directement a une liste."""
    return db.query(Membre).filter(Membre.id_liste == liste_id).all()