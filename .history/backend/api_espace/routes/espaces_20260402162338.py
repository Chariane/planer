from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Membre, Utilisateur
from ..schemas import (
    EspaceCreate, EspaceOut, EspaceUpdate,
    MembreCreate, MembreOut, MembreUpdate, UtilisateurOut
)
from ..security import get_current_user
from ..crud.espace_crud import (
    get_espace_by_id,
    get_espaces_in_workspace,
    create_espace,
    update_espace,
    delete_espace,
    get_space_member,
    get_space_members,
    add_member_to_espace,
    update_space_member_role,
    remove_space_member,
)

router = APIRouter(tags=["Espaces"])


# ========== UTILITAIRES DE VÉRIFICATION (accès au workspace) ==========
def check_workspace_member(
    db: Session,
    workspace_id: str,
    user_id: str,
    required_roles: List[str] = None
) -> Membre:
    """Vérifie que l'utilisateur est membre actif du workspace."""
    membre = db.query(Membre).filter(
        Membre.id_workspace == workspace_id,
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif"
    ).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé au workspace")
    if required_roles and membre.role not in required_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Rôle '{membre.role}' insuffisant. Rôle requis : {required_roles}"
        )
    return membre


# ========== CRÉER UN ESPACE DANS UN WORKSPACE ==========
@router.post("/workspaces/{workspace_id}/spaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_space_in_workspace(
    workspace_id: str,
    space_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Vérifier les droits dans le workspace (Propriétaire, Admin, Editeur)
    check_workspace_member(db, workspace_id, current_user.id,
                           required_roles=["Propriétaire", "Admin", "Editeur"])

    new_space = create_espace(
        db,
        nom=space_in.nom,
        description=space_in.description,
        workspace_id=workspace_id,
        parent_id=space_in.id_espace_parent  # peut être None
    )
    return new_space


# ========== LISTER LES ESPACES RACINE D'UN WORKSPACE ==========
@router.get("/workspaces/{workspace_id}/spaces", response_model=List[EspaceOut])
def get_spaces_in_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Vérifier simplement que l'utilisateur est membre (lecture)
    check_workspace_member(db, workspace_id, current_user.id)

    spaces = get_espaces_in_workspace(db, workspace_id, parent_id=None)
    return spaces


# ========== DÉTAIL D'UN ESPACE ==========
@router.get("/spaces/{space_id}", response_model=EspaceOut)
def get_space(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Vérifier que l'utilisateur est membre du workspace parent
    check_workspace_member(db, space.id_workspace, current_user.id)

    return space


# ========== LISTER LES SOUS-ESPACES D'UN ESPACE ==========
@router.get("/spaces/{space_id}/subspaces", response_model=List[EspaceOut])
def get_subspaces(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    parent_space = get_espace_by_id(db, space_id)
    if not parent_space:
        raise HTTPException(status_code=404, detail="Espace parent non trouvé")

    # Vérifier que l'utilisateur est membre du workspace parent
    check_workspace_member(db, parent_space.id_workspace, current_user.id)

    subspaces = get_espaces_in_workspace(db, parent_space.id_workspace, parent_id=space_id)
    return subspaces


# ========== MODIFIER UN ESPACE ==========
@router.put("/spaces/{space_id}", response_model=EspaceOut)
def update_space(
    space_id: str,
    space_in: EspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Vérifier les droits dans le workspace (Propriétaire, Admin, Editeur)
    check_workspace_member(db, space.id_workspace, current_user.id,
                           required_roles=["Propriétaire", "Admin", "Editeur"])

    updated_space = update_espace(db, space_id, space_in.nom, space_in.description)
    return updated_space


# ========== SUPPRIMER UN ESPACE ==========
@router.delete("/spaces/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Seul Propriétaire ou Admin peut supprimer un espace
    check_workspace_member(db, space.id_workspace, current_user.id,
                           required_roles=["Propriétaire", "Admin"])

    if not delete_espace(db, space_id):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    return None


# ========== CRÉER UN SOUS-ESPACE ==========
@router.post("/spaces/{space_id}/subspaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_subspace(
    space_id: str,
    space_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    parent_space = get_espace_by_id(db, space_id)
    if not parent_space:
        raise HTTPException(status_code=404, detail="Espace parent non trouvé")

    # Vérifier les droits dans le workspace (Propriétaire, Admin, Editeur)
    check_workspace_member(db, parent_space.id_workspace, current_user.id,
                           required_roles=["Propriétaire", "Admin", "Editeur"])

    new_space = create_espace(
        db,
        nom=space_in.nom,
        description=space_in.description,
        workspace_id=parent_space.id_workspace,
        parent_id=space_id
    )
    return new_space


# ========== INVITER UN MEMBRE DANS UN ESPACE ==========
@router.post("/spaces/{space_id}/invite", response_model=MembreOut)
def invite_member_to_space(
    space_id: str,
    membre_in: MembreCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Vérifier que l'utilisateur actuel peut inviter (Propriétaire ou Admin du workspace)
    check_workspace_member(db, space.id_workspace, current_user.id,
                           required_roles=["Propriétaire", "Admin"])

    # Vérifier que l'utilisateur invité existe
    from ..models import Utilisateur
    target_user = db.query(Utilisateur).filter(Utilisateur.id == membre_in.id_utilisateur).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invité non trouvé")

    # Vérifier qu'il n'est pas déjà membre de cet espace
    if get_space_member(db, space_id, membre_in.id_utilisateur):
        raise HTTPException(status_code=400, detail="L'utilisateur est déjà membre de cet espace")

    # Ajouter le membre
    new_membre = add_member_to_espace(
        db,
        espace_id=space_id,
        user_id=membre_in.id_utilisateur,
        role=membre_in.role,
        statut=membre_in.statut
    )
    if not new_membre:
        raise HTTPException(status_code=500, detail="Erreur lors de l'ajout du membre")
    return new_membre


# ========== LISTER LES MEMBRES D'UN ESPACE ==========
@router.get("/spaces/{space_id}/members", response_model=List[MembreOut])
def get_space_members(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Vérifier que l'utilisateur est membre du workspace parent (lecture)
    check_workspace_member(db, space.id_workspace, current_user.id)

    members = get_space_members(db, space_id)
    return members


# ========== MODIFIER LE RÔLE D'UN MEMBRE DANS UN ESPACE ==========
@router.put("/spaces/{space_id}/members/{user_id}", response_model=MembreOut)
def update_space_member_role(
    space_id: str,
    user_id: str,
    membre_in: MembreUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Vérifier que l'utilisateur actuel a le droit de modifier les membres (Propriétaire ou Admin)
    current_membre = check_workspace_member(db, space.id_workspace, current_user.id,
                                            required_roles=["Propriétaire", "Admin"])

    target_membre = get_space_member(db, space_id, user_id)
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre non trouvé dans cet espace")

    # Ne pas autoriser la modification du rôle du propriétaire du workspace (sauf si l'actuel est propriétaire)
    if target_membre.role == "Propriétaire" and current_membre.role != "Propriétaire":
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier le rôle du propriétaire")

    updated = update_space_member_role(
        db,
        espace_id=space_id,
        user_id=user_id,
        role=membre_in.role,
        statut=membre_in.statut
    )
    return updated


# ========== RETIRER UN MEMBRE D'UN ESPACE ==========
@router.delete("/spaces/{space_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_space_member(
    space_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    # Vérifier que l'utilisateur actuel a le droit de retirer des membres
    current_membre = check_workspace_member(db, space.id_workspace, current_user.id,
                                            required_roles=["Propriétaire", "Admin"])

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer vous‑même de l'espace")

    target_membre = get_space_member(db, space_id, user_id)
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre non trouvé dans cet espace")

    if target_membre.role == "Propriétaire":
        raise HTTPException(status_code=403, detail="Le propriétaire du workspace ne peut pas être retiré de l'espace")

    if not remove_space_member(db, space_id, user_id):
        raise HTTPException(status_code=500, detail="Erreur lors du retrait du membre")
    return None


# ========== ARBORESCENCE D'UN ESPACE (optionnel) ==========
@router.get("/spaces/{space_id}/tree", response_model=dict)
def get_space_tree(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = get_espace_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")

    check_workspace_member(db, space.id_workspace, current_user.id)

    def build_tree(sp_id):
        sp = get_espace_by_id(db, sp_id)
        if not sp:
            return None
        children = get_espaces_in_workspace(db, sp.id_workspace, parent_id=sp.id)
        return {
            "id": sp.id,
            "nom": sp.nom,
            "description": sp.description,
            "created_at": sp.created_at,
            "sous_espaces": [build_tree(child.id) for child in children]
        }

    return build_tree(space_id)