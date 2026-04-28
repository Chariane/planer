from datetime import datetime
from typing import Any, List, Optional
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import Espace, Liste, Membre, PlanerEntreprise, Tache, Utilisateur, Workspace
from sqlalchemy import or_, and_

WORKSPACE_OWNER_ROLE = "Créateur"
WORKSPACE_ADMIN_ROLE = "Administrateur"
WORKSPACE_MEMBER_ROLE = "Membre"
WORKSPACE_GUEST_ROLE = "Invité"

WORKSPACE_READ_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
    WORKSPACE_MEMBER_ROLE,
    WORKSPACE_GUEST_ROLE,
}
WORKSPACE_MANAGEMENT_ROLES = {WORKSPACE_OWNER_ROLE, WORKSPACE_ADMIN_ROLE}
WORKSPACE_ADMIN_MANAGEABLE_ROLES = {WORKSPACE_MEMBER_ROLE, WORKSPACE_GUEST_ROLE}

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


def _is_workspace_owner(workspace: Workspace, user_id: str) -> bool:
    return workspace.id_utilisateur == user_id


def _resolve_workspace_role(
    workspace: Workspace,
    membre: Optional[Membre],
    current_user_id: str,
) -> Optional[str]:
    if _is_workspace_owner(workspace, current_user_id):
        return WORKSPACE_OWNER_ROLE
    if membre:
        return membre.role
    return None


def _resolve_workspace_status(
    workspace: Workspace,
    membre: Optional[Membre],
    current_user_id: str,
) -> Optional[str]:
    if _is_workspace_owner(workspace, current_user_id):
        return "Actif"
    if membre:
        return membre.statut
    return None


def _get_workspace_actor_context(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    membre = get_member(db, workspace_id, current_user_id, active_only=True)
    role = _resolve_workspace_role(workspace, membre, current_user_id)
    statut = _resolve_workspace_status(workspace, membre, current_user_id)

    if role is None or statut != "Actif":
        raise HTTPException(status_code=403, detail="Acces refuse a ce workspace")

    return workspace, membre, role


def _validate_workspace_member_management_permissions(
    workspace: Workspace,
    actor_role: str,
    target_user_id: str,
    target_member: Optional[Membre],
):
    if workspace.id_utilisateur == target_user_id:
        raise HTTPException(
            status_code=403,
            detail="Le createur du workspace ne peut pas etre modifie ou retire.",
        )

    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")

    if actor_role == WORKSPACE_ADMIN_ROLE and target_member.role not in WORKSPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut gerer que les membres et invites du workspace.",
        )


def _validate_workspace_invitation_permissions(actor_role: str, invited_role: str):
    if actor_role == WORKSPACE_ADMIN_ROLE and invited_role not in WORKSPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut inviter que des membres ou invites dans le workspace.",
        )

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

    owner_user_id = workspace.id_utilisateur
    current_user_role = None
    current_user_statut = None

    if effective_member:
        current_user_role = (
            WORKSPACE_OWNER_ROLE
            if effective_member.id_utilisateur == owner_user_id
            else effective_member.role
        )
        current_user_statut = (
            "Actif"
            if effective_member.id_utilisateur == owner_user_id
            else effective_member.statut
        )
    elif owner_user_id:
        current_user_role = WORKSPACE_OWNER_ROLE
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
    workspace, membre, _ = _get_workspace_actor_context(db, workspace_id, current_user_id)
    return workspace, membre


def _require_workspace_read_access(db: Session, workspace_id: str, current_user_id: str):
    workspace, membre, role = _get_workspace_actor_context(db, workspace_id, current_user_id)
    if role not in WORKSPACE_READ_ROLES:
        raise HTTPException(status_code=403, detail="Acces refuse a ce workspace")
    return workspace, membre, role


def _require_workspace_owner_access(db: Session, workspace_id: str, current_user_id: str):
    workspace, membre, role = _get_workspace_actor_context(db, workspace_id, current_user_id)
    if role != WORKSPACE_OWNER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Seul le createur du workspace peut effectuer cette action.",
        )
    return workspace, membre, role


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    workspace, membre, role = _get_workspace_actor_context(db, workspace_id, current_user_id)
    if role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Seuls le createur et les administrateurs du workspace peuvent effectuer cette action.",
        )
    return workspace, membre, role


def _require_workspace_admin_access(db: Session, workspace_id: str, current_user_id: str):
    """Alias explicite pour l'acces d'administration du workspace."""
    return _require_workspace_management_access(db, workspace_id, current_user_id)


def _require_workspace_member_management_access(
    db: Session,
    workspace_id: str,
    current_user_id: str,
    target_user_id: str,
):
    from ..crud.utilisateur import get_member

    workspace, membre, actor_role = _require_workspace_management_access(
        db, workspace_id, current_user_id
    )
    target_member = get_member(db, workspace_id, target_user_id)
    _validate_workspace_member_management_permissions(
        workspace,
        actor_role,
        target_user_id,
        target_member,
    )
    return workspace, membre, actor_role, target_member


def _require_workspace_invitation_access(
    db: Session,
    workspace_id: str,
    current_user_id: str,
    invited_role: str,
):
    workspace, membre, actor_role = _require_workspace_management_access(
        db, workspace_id, current_user_id
    )
    _validate_workspace_invitation_permissions(actor_role, invited_role)
    return workspace, membre, actor_role



def get_owned_workspaces(db: Session, user_id: str) -> List[dict]:
    """Liste des workspaces crees par l'utilisateur."""
    workspaces = db.query(Workspace).filter(Workspace.id_utilisateur == user_id).all()
    return [_serialize_workspace(ws) for ws in workspaces]


def get_joined_workspaces(db: Session, user_id: str) -> List[dict]:
    """Liste des workspaces ou l'utilisateur est invite (Role Membre/Invite)."""
    owned_ids = db.query(Workspace.id).filter(Workspace.id_utilisateur == user_id).all()
    owned_ids = {row[0] for row in owned_ids}
    
    memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_workspace.isnot(None),
        Membre.statut == "Actif",
        Membre.id_workspace.notin_(owned_ids) if owned_ids else True
    ).all()
    return [_serialize_workspace(m.workspace, membre=m) for m in memberships]


def get_joined_espaces(db: Session, user_id: str) -> List[dict]:
    """Espaces rejoins directement."""
    owned_ids = db.query(Workspace.id).filter(Workspace.id_utilisateur == user_id).all()
    owned_ids = {row[0] for row in owned_ids}

    memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_espace.isnot(None),
        Membre.statut == "Actif",
        Membre.role.notin_([WORKSPACE_OWNER_ROLE, WORKSPACE_ADMIN_ROLE])
    ).all()
    
    res = []
    for m in memberships:
        ws = m.espace.workspace if m.espace else None
        if ws and ws.id in owned_ids:
            continue
        res.append({
            "id": m.id_espace,
            "id_espace": m.id_espace,
            "nom": m.espace.nom if m.espace else "Inconnu",
            "role": m.role,
            "workspace_id": ws.id if ws else None,
            "id_workspace": ws.id if ws else None,
            "workspace_nom": ws.nom if ws else None
        })
    return res


def get_joined_listes(db: Session, user_id: str) -> List[dict]:
    """Listes rejointes directement."""
    owned_ids = db.query(Workspace.id).filter(Workspace.id_utilisateur == user_id).all()
    owned_ids = {row[0] for row in owned_ids}

    memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_liste.isnot(None),
        Membre.statut == "Actif",
        Membre.role.notin_([WORKSPACE_OWNER_ROLE, WORKSPACE_ADMIN_ROLE])
    ).all()
    
    res = []
    for m in memberships:
        ws = m.liste.workspace or (m.liste.espace.workspace if m.liste.espace else None)
        if ws and ws.id in owned_ids:
            continue
        res.append({
            "id": m.id_liste,
            "id_liste": m.id_liste,
            "nom": m.liste.nom if m.liste else "Inconnu",
            "role": m.role,
            "workspace_id": ws.id if ws else None,
            "id_workspace": ws.id if ws else None,
            "workspace_nom": ws.nom if ws else None,
            "id_espace": m.liste.id_espace if m.liste else None
        })
    return res


def get_joined_taches(db: Session, user_id: str) -> List[dict]:
    """Taches rejointes directement."""
    owned_ids = db.query(Workspace.id).filter(Workspace.id_utilisateur == user_id).all()
    owned_ids = {row[0] for row in owned_ids}

    memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_tache.isnot(None),
        Membre.statut == "Actif",
        Membre.role.notin_([WORKSPACE_OWNER_ROLE, WORKSPACE_ADMIN_ROLE])
    ).all()
    
    res = []
    for m in memberships:
        liste = m.tache.liste
        ws = liste.workspace or (liste.espace.workspace if (liste and liste.espace) else None)
        if ws and ws.id in owned_ids:
            continue
        res.append({
            "id": m.id_tache,
            "id_tache": m.id_tache,
            "nom": m.tache.titre if m.tache else "Inconnu",
            "role": m.role,
            "workspace_id": ws.id if ws else None,
            "id_workspace": ws.id if ws else None,
            "workspace_nom": ws.nom if ws else None,
            "id_espace": liste.id_espace if liste else None,
            "id_liste": m.tache.id_liste
        })
    return res


def get_user_navigation_data(db: Session, user_id: str) -> dict:
    """Structure aggregee utilisant les fonctions granulaires."""
    return {
        "owned_workspaces": get_owned_workspaces(db, user_id),
        "joined_workspaces": get_joined_workspaces(db, user_id),
        "joined_espaces": get_joined_espaces(db, user_id),
        "joined_listes": get_joined_listes(db, user_id),
        "joined_taches": get_joined_taches(db, user_id)
    }


def _get_user_membership_data(db: Session, user_id: str):
    owned = db.query(Workspace).filter(Workspace.id_utilisateur == user_id).all()
    memberships = (
        db.query(Membre)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.id_workspace.isnot(None),
            Membre.statut == "Actif",
        )
        .all()
    )
    return owned, memberships


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
    workspace, ws_member, actor_role = _require_workspace_read_access(db, workspace_id, user_id)
    
    # 2. Récupérer les ressources directes liées à ce workspace
    # On ne prend que ce qui est 'Membre' ou 'Invité' (Accès directs)
    DIRECT_ROLES = {WORKSPACE_MEMBER_ROLE, WORKSPACE_GUEST_ROLE}
    
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
                listes.append({
                    "id": m.id_liste, 
                    "nom": m.liste.nom, 
                    "role": m.role,
                    "id_espace": m.liste.id_espace
                })
                
        # Tâches du workspace (via liste)
        elif m.id_tache and m.tache:
            liste = m.tache.liste
            if liste and (liste.id_workspace == workspace_id or (liste.espace and liste.espace.id_workspace == workspace_id)):
                taches.append({
                    "id": m.id_tache, 
                    "nom": m.tache.titre, 
                    "role": m.role,
                    "id_liste": m.tache.id_liste,
                    "id_espace": liste.id_espace if liste else None
                })

    return {
        "workspace_id": workspace_id,
        "workspace_nom": workspace.nom,
        "my_workspace_role": actor_role,
        "direct_access": {
            "espaces": espaces,
            "listes": listes,
            "taches": taches
        }
    }
