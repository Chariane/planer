from datetime import datetime
from typing import Any, Optional
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import Espace, Liste, Membre, PlanerEntreprise, Tache, Utilisateur, Workspace
from sqlalchemy import or_, and_

WORKSPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}

def is_premium_user(user: Optional[Utilisateur]) -> bool:
    if not user:
        return False
    if user.type_compte != "Premium":
        return False
    return user.premium_expire_at is not None and user.premium_expire_at > datetime.utcnow()


def is_premium_entreprise(entreprise: Optional[PlanerEntreprise]) -> bool:
    if not entreprise:
        return False
    if not entreprise.is_premium or entreprise.statut_compte != "Actif":
        return False
    return entreprise.premium_expire_at is not None and entreprise.premium_expire_at > datetime.utcnow()


def user_has_premium_workspace_access(db: Session, user_id: str) -> bool:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if is_premium_user(user):
        return True

    entreprise = db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()
    return is_premium_entreprise(entreprise)


def get_workspace_count_for_owner(db: Session, user_id: str) -> int:
    return db.query(Workspace).filter(Workspace.id_utilisateur == user_id).count()


def get_espace_count_for_owner(db: Session, user_id: str) -> int:
    return (
        db.query(Espace)
        .join(Workspace, Espace.id_workspace == Workspace.id)
        .filter(Workspace.id_utilisateur == user_id)
        .count()
    )


def can_create_workspace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_workspace_count_for_owner(db, user_id) < 1


def can_create_espace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_espace_count_for_owner(db, user_id) < 1


def commit_or_raise(
    db: Session,
    *,
    detail: str,
    status_code: int = 409,
    refresh_instance: Any | None = None,
) -> None:
    try:
        db.commit()
        if refresh_instance is not None:
            db.refresh(refresh_instance)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status_code, detail=detail) from exc

def _serialize_workspace(workspace, membre=None, member_count=None):
    effective_member = membre
    if effective_member is None:
        effective_member = next(
            (
                workspace_member
                for workspace_member in workspace.membres
                if workspace_member.id_utilisateur == workspace.id_utilisateur
            ),
            None,
        )

    resolved_member_count = (
        member_count
        if member_count is not None
        else sum(1 for member in (workspace.membres or []) if member.statut == "Actif")
    )

    current_user_role = effective_member.role if effective_member else None
    current_user_statut = effective_member.statut if effective_member else None

    if current_user_role is None and workspace.id_utilisateur:
        current_user_role = "Administrateur"
        current_user_statut = "Actif"

    return {
        "id": workspace.id,
        "nom": workspace.nom,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
        "id_utilisateur": workspace.id_utilisateur,
        "member_count": resolved_member_count,
        "current_user_role": current_user_role,
        "current_user_statut": current_user_statut,
    }


def _serialize_member(membre):
    utilisateur = membre.utilisateur
    return {
        "id": membre.id,
        "created_at": membre.created_at,
        "role": membre.role,
        "statut": membre.statut,
        "id_utilisateur": membre.id_utilisateur,
        "id_workspace": membre.id_workspace,
        "id_espace": membre.id_espace,
        "id_liste": membre.id_liste,
        "id_tache": membre.id_tache,
        "utilisateur": (
            {
                "id": utilisateur.id,
                "username": utilisateur.username,
                "email": utilisateur.email,
                "nom": utilisateur.nom,
                "prenoms": utilisateur.prenoms,
            }
            if utilisateur
            else None
        ),
    }


def _get_member_or_403(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member

    membre = get_member(db, workspace_id, current_user_id, active_only=True)
    if not membre:
        raise HTTPException(status_code=403, detail="Acces refuse")
    return membre


def _get_workspace_member_context(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    membre = get_member(db, workspace_id, current_user_id, active_only=True)
    if membre:
        return workspace, membre

    if workspace.id_utilisateur == current_user_id:
        return workspace, None

    raise HTTPException(status_code=403, detail="Acces refuse")


def _require_workspace_owner_access(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    if workspace.id_utilisateur != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Seul le createur peut modifier ce workspace",
        )

    return workspace, get_member(db, workspace_id, current_user_id)


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    if workspace.id_utilisateur == current_user_id:
        return get_member(db, workspace_id, current_user_id)

    membre = _get_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants")
    return membre


def _require_workspace_admin_access(db: Session, workspace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est administrateur (Créateur ou Administrateur) du workspace.

    Retourne un tuple (workspace, membre).
    Lève une 404 si le workspace n'existe pas,
    une 403 si l'utilisateur n'a pas les droits d'administration.
    """
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    if workspace.id_utilisateur == current_user_id:
        return workspace, get_member(db, workspace_id, current_user_id)

    membre = get_member(db, workspace_id, current_user_id, active_only=True)
    if not membre or membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs du workspace",
        )
    return workspace, membre


def get_all_user_resources(db: Session, user_id: str) -> dict:
    """
    Récupère TOUTES les ressources auxquelles l'utilisateur a accès via la table Membre 
    ou en étant directement propriétaire du Workspace.
    """
    from sqlalchemy.orm import joinedload
    
    # 1. Workspaces dont l'utilisateur est PROPRIÉTAIRE (Admin direct)
    owned_workspaces = db.query(Workspace).filter(Workspace.id_utilisateur == user_id).all()
    
    # 2. Toutes les adhésions ACTIVES
    my_memberships = (
        db.query(Membre)
        .options(
            joinedload(Membre.workspace),
            joinedload(Membre.espace),
            joinedload(Membre.liste),
            joinedload(Membre.tache)
        )
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif"
        )
        .all()
    )
    
    workspaces_joined = []
    espaces_joined = []
    listes_joined = []
    taches_joined = []
    
    # Éviter les doublons pour les workspaces
    owned_ws_ids = {ws.id for ws in owned_workspaces}

    for m in my_memberships:
        if m.id_workspace:
            if m.id_workspace not in owned_ws_ids:
                workspaces_joined.append(_serialize_workspace(m.workspace, membre=m))
        
        elif m.id_espace:
            espaces_joined.append({
                "id": m.id_espace,
                "nom": m.espace.nom if m.espace else "Espace inconnu",
                "role": m.role,
                "workspace_id": m.espace.id_workspace if m.espace else None,
                "created_at": m.created_at
            })
            
        elif m.id_liste:
            listes_joined.append({
                "id": m.id_liste,
                "nom": m.liste.nom if m.liste else "Projet inconnu",
                "role": m.role,
                "id_workspace": m.liste.id_workspace if m.liste else None,
                "id_espace": m.liste.id_espace if m.liste else None,
                "created_at": m.created_at
            })
            
        elif m.id_tache:
            taches_joined.append({
                "id": m.id_tache,
                "nom": m.tache.nom if m.tache else "Tâche inconnue",
                "role": m.role,
                "id_liste": m.tache.id_liste if m.tache else None,
                "created_at": m.created_at
            })

    return {
        "workspaces": [_serialize_workspace(ws) for ws in owned_workspaces] + workspaces_joined,
        "joined_resources": {
            "espaces": espaces_joined,
            "listes": listes_joined,
            "taches": taches_joined
        }
    }


def get_user_workspaces_listing(db: Session, user_id: str) -> dict:
    """Récupère les workspaces possédés et rejoints séparément."""
    owned = db.query(Workspace).filter(Workspace.id_utilisateur == user_id).all()
    
    joined_memberships = (
        db.query(Membre)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.id_workspace.isnot(None),
            Membre.statut == "Actif"
        )
        .all()
    )
    
    owned_ids = {ws.id for ws in owned}
    joined = [
        _serialize_workspace(m.workspace, membre=m) 
        for m in joined_memberships 
        if m.id_workspace not in owned_ids
    ]
    
    return {
        "owned": [_serialize_workspace(ws) for ws in owned],
        "joined": joined
    }


def get_workspace_local_resources(db: Session, workspace_id: str, user_id: str) -> dict:
    """Récupère les ressources directes (Espaces, Listes, Tâches) au sein d'un workspace spécifique."""
    # 1. Vérifier le rôle de l'utilisateur dans ce workspace
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {}
    
    ws_member = db.query(Membre).filter(
        Membre.id_workspace == workspace_id,
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif"
    ).first()
    
    # 2. Récupérer les ressources directes liées à ce workspace
    # On ne prend que ce qui est 'Membre' ou 'Invité' (Accès directs)
    DIRECT_ROLES = {"Membre", "Invité"}
    
    all_memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif",
        Membre.role.in_(DIRECT_ROLES)
    ).all()
    
    espaces = []
    listes = []
    taches = []
    
    for m in all_memberships:
        # Espaces du workspace
        if m.id_espace and m.espace and m.espace.id_workspace == workspace_id:
            espaces.append({"id": m.id_espace, "nom": m.espace.nom, "role": m.role})
            
        # Listes du workspace (directes ou via espace)
        elif m.id_liste and m.liste:
            if m.liste.id_workspace == workspace_id or (m.liste.espace and m.liste.espace.id_workspace == workspace_id):
                listes.append({"id": m.id_liste, "nom": m.liste.nom, "role": m.role})
                
        # Tâches du workspace (via liste)
        elif m.id_tache and m.tache:
            liste = m.tache.liste
            if liste and (liste.id_workspace == workspace_id or (liste.espace and liste.espace.id_workspace == workspace_id)):
                taches.append({"id": m.id_tache, "nom": m.tache.titre, "role": m.role})

    return {
        "workspace_id": workspace_id,
        "workspace_nom": workspace.nom,
        "my_workspace_role": ws_member.role if ws_member else ("Créateur" if workspace.id_utilisateur == user_id else None),
        "direct_access": {
            "espaces": espaces,
            "listes": listes,
            "taches": taches
        }
    }
