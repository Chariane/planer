# backend/api_liste_et_tache/crud/liste.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import timedelta
from ..core.function import (
    LISTE_ADMIN_ROLE,
    LISTE_GUEST_ROLE,
    LISTE_MANAGEMENT_ROLES,
    LISTE_MEMBER_ROLE,
    LISTE_OWNER_ROLE,
    ResourceType,
    Role,
    validate_role_hierarchy,
    commit_or_raise,
)
from ..core.security import create_access_token, decode_invitation_token
from ..models import Liste, Membre, Canevas, Section, Tache, Checklist, Utilisateur
from ..schemas import WorkspaceMemberInvite


def get_liste_by_id(db: Session, liste_id: str) -> Optional[Liste]:
    return db.query(Liste).filter(Liste.id == liste_id).first()


def get_listes_for_workspace(db: Session, workspace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_workspace == workspace_id).all()


def get_listes_for_espace(db: Session, espace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_espace == espace_id).all()


def get_liste_member_record(db: Session, liste_id: str, user_id: str) -> Optional[Membre]:
    return db.query(Membre).filter(
        Membre.id_liste == liste_id,
        Membre.id_utilisateur == user_id
    ).first()


def _ensure_unique_liste_sibling_name(
    db: Session,
    *,
    nom: str,
    id_espace: Optional[str],
    id_workspace: Optional[str],
    exclude_id: Optional[str] = None,
) -> None:
    normalized_name = nom.strip().lower()
    query = db.query(Liste).filter(func.lower(func.trim(Liste.nom)) == normalized_name)
    if id_espace:
        query = query.filter(Liste.id_espace == id_espace)
    else:
        query = query.filter(Liste.id_workspace == id_workspace, Liste.id_espace.is_(None))
    if exclude_id:
        query = query.filter(Liste.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une liste portant ce nom existe deja dans ce parent.",
        )


LISTE_ALLOWED_ROLES = {
    LISTE_OWNER_ROLE,
    LISTE_ADMIN_ROLE,
    LISTE_MEMBER_ROLE,
    LISTE_GUEST_ROLE,
}


def create_liste(
    db: Session,
    nom: str,
    description: str = None,
    id_espace: str = None,
    id_workspace: str = None,
    creator_user_id: str | None = None,
) -> Liste:
    _ensure_unique_liste_sibling_name(
        db,
        nom=nom,
        id_espace=id_espace,
        id_workspace=id_workspace,
    )
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

    if creator_user_id:
        db.add(
            Membre(
                id_utilisateur=creator_user_id,
                id_liste=liste.id,
                role=LISTE_OWNER_ROLE,
                statut="Actif",
            )
        )
    
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

    target_nom = kwargs.get("nom", liste.nom)
    target_espace_id = kwargs.get("id_espace", liste.id_espace)
    target_workspace_id = kwargs.get("id_workspace", liste.id_workspace)
    if any(key in kwargs for key in ("nom", "id_espace", "id_workspace")):
        _ensure_unique_liste_sibling_name(
            db,
            nom=target_nom,
            id_espace=target_espace_id,
            id_workspace=target_workspace_id,
            exclude_id=liste.id,
        )
    
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
    """
    Supprime une liste et toutes ses dépendances :
    - Tâches et leurs checklists
    - Membres de la liste et des tâches
    - Canevas, sections et checklists de sections
    """
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        return False
    
    # 1. Récupérer toutes les tâches de la liste
    taches = db.query(Tache).filter(Tache.id_liste == liste_id).all()
    tache_ids = [t.id for t in taches]
    
    # 2. Supprimer les checklists des tâches
    if tache_ids:
        db.query(Checklist).filter(Checklist.id_tache.in_(tache_ids)).delete(synchronize_session=False)
    
    # 3. Supprimer les membres assignés aux tâches
    if tache_ids:
        db.query(Membre).filter(Membre.id_tache.in_(tache_ids)).delete(synchronize_session=False)
    
    # 4. Supprimer les tâches
    for tache in taches:
        db.delete(tache)
    
    # 5. Supprimer les membres de la liste
    db.query(Membre).filter(Membre.id_liste == liste_id).delete(synchronize_session=False)
    
    # 6. Supprimer le canevas et ses dépendances
    canevas = db.query(Canevas).filter(Canevas.id_liste == liste_id).first()
    if canevas:
        # 6a. Récupérer les sections du canevas
        sections = db.query(Section).filter(Section.id_canevas == canevas.id).all()
        section_ids = [s.id for s in sections]
        
        # 6b. Supprimer les checklists des sections
        if section_ids:
            db.query(Checklist).filter(Checklist.id_section.in_(section_ids)).delete(synchronize_session=False)
        
        # 6c. Supprimer les sections
        for section in sections:
            db.delete(section)
        
        # 6d. Supprimer le canevas
        db.delete(canevas)
    
    # 7. Supprimer la liste
    db.delete(liste)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur suppression liste {liste_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression de la liste: {str(e)}",
        )
    
    return True


def _get_liste_with_scope(db: Session, liste_id: str) -> Optional[Liste]:
    return (
        db.query(Liste)
        .options(joinedload(Liste.espace), joinedload(Liste.workspace))
        .filter(Liste.id == liste_id)
        .first()
    )


def assign_member_to_liste(
    db: Session,
    liste_id: str,
    utilisateur_id: str,
    role: str = LISTE_MEMBER_ROLE,
) -> Membre:
    """Ajoute ou met a jour un utilisateur sur une liste avec un role local explicite."""
    liste = _get_liste_with_scope(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste introuvable.")

    if role not in LISTE_ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Role de liste invalide.")

    validate_role_hierarchy(
        db,
        utilisateur_id,
        ResourceType.LISTE,
        liste_id,
        role,
    )

    existing = (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.id_utilisateur == utilisateur_id,
        )
        .first()
    )

    if role == LISTE_OWNER_ROLE:
        existing_owner = (
            db.query(Membre)
            .filter(
                Membre.id_liste == liste_id,
                Membre.role == LISTE_OWNER_ROLE,
                Membre.id_utilisateur != utilisateur_id,
            )
            .first()
        )
        if existing_owner:
            raise HTTPException(
                status_code=409,
                detail="Cette liste possede deja un createur local. Utilisez un transfert explicite de propriete.",
            )

    if existing:
        existing.role = role
        existing.statut = "Actif"
        try:
            db.commit()
            db.refresh(existing)
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Erreur lors de la mise a jour du membre de la liste.",
            ) from exc
        return existing

    assignation = Membre(
        id_liste=liste_id,
        id_utilisateur=utilisateur_id,
        role=role,
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
    """Recupere tous les membres assignés directement à une liste OU à ses tâches."""
    # 1. Membres directs de la liste
    direct_query = (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_liste == liste_id)
    )
    direct_members = direct_query.all()

    # 2. Membres des tâches de cette liste
    task_members_query = (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .join(Tache, Membre.id_tache == Tache.id)
        .filter(Tache.id_liste == liste_id)
    )
    task_members = task_members_query.all()

    # Fusionner sans doublons (basé sur id_utilisateur)
    # On privilégie le record direct (rôle souvent plus élevé)
    seen_users = set()
    result = []
    
    for m in direct_members:
        if m.id_utilisateur not in seen_users:
            result.append(m)
            seen_users.add(m.id_utilisateur)
            
    for m in task_members:
        if m.id_utilisateur not in seen_users:
            result.append(m)
            seen_users.add(m.id_utilisateur)
            
    return result


# ============================================================================
# INVITATIONS DANS LES LISTES
# ============================================================================

def invite_member_to_liste(db: Session, liste_id: str, membre_in: WorkspaceMemberInvite) -> dict:
    """
    Invite un utilisateur à une liste.
    Supporte les utilisateurs existants (statut 'En attente') et les nouveaux (Token JWT).
    """
    # 1. Vérification de l'existence de la liste
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée.")
    
    # 2. Recherche de l'utilisateur par email ou username
    query = db.query(Utilisateur)
    if membre_in.email:
        query = query.filter(func.lower(Utilisateur.email) == membre_in.email.lower())
    else:
        query = query.filter(func.lower(Utilisateur.username) == membre_in.username.lower())
    
    target_user = query.first()
    TOKEN_TYPE = "liste_invitation"
    
    if target_user:
        # Valider la hiérarchie des rôles
        validate_role_hierarchy(
            db,
            target_user.id,
            ResourceType.LISTE,
            liste_id,
            membre_in.role,
        )
        
        # CAS 1 : Utilisateur existant
        membre = get_liste_member_record(db, liste_id, target_user.id)
        if membre:
            if membre.statut == "Actif":
                raise HTTPException(
                    status_code=409,
                    detail="Cet utilisateur est déjà membre actif de cette liste."
                )
            # Si l'invitation existe déjà, on met à jour son rôle et on la repasse en attente
            membre.role = membre_in.role
            membre.statut = "En attente"
        else:
            membre = Membre(
                id_utilisateur=target_user.id,
                id_liste=liste_id,
                role=membre_in.role,
                statut="En attente",
            )
            db.add(membre)
        
        commit_or_raise(db, detail="Impossible de créer ou mettre à jour le membre.")
        
        # Token pour utilisateur existant
        token = create_access_token(
            data={
                "sub": target_user.id,
                "email": target_user.email,
                "liste_id": liste_id,
                "workspace_id": liste.id_workspace,
                "espace_id": liste.id_espace,
                "role": membre_in.role,
                "type": TOKEN_TYPE
            },
            expires_delta=timedelta(days=7),
        )
        return {"membre": membre, "invitation_token": token}
    
    else:
        # CAS 2 : Invité externe
        if not membre_in.email:
            raise HTTPException(
                status_code=400,
                detail="Email obligatoire pour inviter un utilisateur non inscrit."
            )
        
        token = create_access_token(
            data={
                "email": membre_in.email,
                "liste_id": liste_id,
                "workspace_id": liste.id_workspace,
                "espace_id": liste.id_espace,
                "role": membre_in.role,
                "type": TOKEN_TYPE,
            },
            expires_delta=timedelta(days=4),
        )
        return {"token": token}


def accept_liste_invitation(db: Session, user_id: str, invitation_token: str) -> Membre:
    """Accepte une invitation à une liste via token JWT."""
    payload = decode_invitation_token(invitation_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expiré.")
    
    # Support des deux formats de token
    token_type = payload.get("type")
    token_scope = payload.get("scope")
    is_standard_invitation = token_type == "liste_invitation"
    is_existing_user_legacy_invitation = token_scope == "liste_invitation_accept"
    
    if not is_standard_invitation and not is_existing_user_legacy_invitation:
        raise HTTPException(status_code=403, detail="Type de token invalide pour cette action.")
    
    target_liste_id = payload.get("liste_id")
    if not target_liste_id:
        raise HTTPException(status_code=400, detail="ID de la liste absent du token.")
    
    liste = get_liste_by_id(db, target_liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="La liste cible n'existe plus.")
    
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    
    token_sub = payload.get("sub")
    token_email = payload.get("email")
    
    if token_sub and token_sub != user_id:
        raise HTTPException(status_code=403, detail="Cette invitation appartient à un autre utilisateur.")
    
    if token_email and token_email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Cet email d'invitation ne correspond pas au vôtre.")
    
    existing_member = get_liste_member_record(db, target_liste_id, user_id)
    invited_role = payload.get("role") or (
        existing_member.role if existing_member and existing_member.statut != "Actif" else LISTE_MEMBER_ROLE
    )
    
    # Valider la hiérarchie des rôles
    validate_role_hierarchy(
        db,
        user_id,
        ResourceType.LISTE,
        target_liste_id,
        invited_role,
    )
    
    if existing_member:
        if existing_member.statut == "Actif":
            raise HTTPException(status_code=409, detail="Invitation déjà acceptée.")
        existing_member.role = invited_role
        existing_member.statut = "Actif"
        commit_or_raise(db, detail="Impossible d'activer votre statut de membre.", refresh_instance=existing_member)
        return existing_member
    
    new_member = Membre(
        id_utilisateur=user_id,
        id_liste=target_liste_id,
        role=invited_role,
        statut="Actif"
    )
    db.add(new_member)
    commit_or_raise(db, detail="Impossible de finaliser votre adhésion à la liste.", refresh_instance=new_member)
    
    return new_member
