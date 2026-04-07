from typing import Optional, List, Any
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator, field_validator
import re
from datetime import datetime

PHONE_NUMBER_CLEANED_REGEX = r"^\+?\d{7,20}$"
NAME_REGEX = r"^[a-zA-ZÀ-ÿ\s'-]+$"
USERNAME_REGEX = r"^[a-zA-Z0-9_.-]+$"

# ----------------------------------------
# 🔐 UTILISATEURS
# ----------------------------------------

class UtilisateurBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30, pattern=USERNAME_REGEX)
    nom: Optional[str] = Field(None, min_length=2, max_length=50, pattern=NAME_REGEX)
    prenoms: Optional[str] = Field(None, min_length=2, max_length=50, pattern=NAME_REGEX)
    telephone: Optional[str] = None
    delivery_address: Optional[str] = Field(None, min_length=2, max_length=200)
    is_entreprise: Optional[bool] = False

    @model_validator(mode='before')
    @classmethod
    def clean_telephone(cls, data: Any) -> Any:
        if isinstance(data, dict) and 'telephone' in data and data['telephone']:
            phone = str(data['telephone'])
            if phone.startswith('+'):
                data['telephone'] = '+' + re.sub(r'\D', '', phone[1:])
            else:
                data['telephone'] = re.sub(r'\D', '', phone)
        return data

    @field_validator('telephone')
    @classmethod
    def validate_telephone(cls, v: Optional[str]) -> Optional[str]:
        if v and not re.fullmatch(PHONE_NUMBER_CLEANED_REGEX, v):
            raise ValueError("Numéro de téléphone invalide (7 à 20 chiffres, avec ou sans '+').")
        return v

class UtilisateurCreate(UtilisateurBase):
    password: str = Field(..., min_length=8)
    is_active: Optional[bool] = True
    is_user: Optional[bool] = True
    is_admin: Optional[bool] = False
    is_super_admin: Optional[bool] = False
    is_livreur: Optional[bool] = False
    is_entreprise: Optional[bool] = False

class UtilisateurUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern=USERNAME_REGEX)
    prenoms: Optional[str] = Field(None, min_length=2, max_length=50, pattern=NAME_REGEX)
    nom: Optional[str] = Field(None, min_length=2, max_length=50, pattern=NAME_REGEX)
    telephone: Optional[str] = None
    delivery_address: Optional[str] = Field(None, min_length=5, max_length=200)
    current_password: Optional[str] = Field(None, min_length=8)
    new_password: Optional[str] = Field(None, min_length=8)
    biographie: Optional[str] = None
    genre: Optional[str] = None
    date_nais: Optional[datetime] = None
    pays: Optional[str] = None
    ville: Optional[str] = None

class UtilisateurOut(UtilisateurBase):
    id: str
    is_active: bool
    is_user: bool
    is_admin: bool
    is_super_admin: bool
    is_entreprise: bool
    is_livreur: bool
    biographie: Optional[str] = None
    genre: Optional[str] = None
    date_nais: Optional[datetime] = None
    pays: Optional[str] = None
    ville: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------
# 🔐 AUTHENTIFICATION
# ----------------------------------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UtilisateurOut
    model_config = ConfigDict(from_attributes=True)

class TokenData(BaseModel):
    user_id: Optional[str] = None

# ----------------------------------------
# 🏢 SCHÉMAS PLANER
# ----------------------------------------

# Entreprise
class EntrepriseBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    telephone: Optional[str] = None
    statut_juridique: Optional[str] = Field(None, max_length=50)
    adresse: Optional[str] = Field(None, max_length=255)
    numero_ifu: Optional[str] = Field(None, max_length=13)
    numero_rccm: Optional[str] = Field(None, max_length=50)
    date_creation_entreprise: Optional[datetime] = None
    nom_responsable_entreprise: Optional[str] = Field(None, max_length=50)
    prenoms_responsable_entreprise: Optional[str] = Field(None, max_length=255)
    telephone_responsable_entreprise: Optional[str] = Field(None, max_length=20)
    logo: Optional[str] = Field(None, max_length=255)
    site_web: Optional[str] = Field(None, max_length=255)

class EntrepriseCreate(EntrepriseBase):
    id_utilisateur: str

class EntrepriseUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    telephone: Optional[str] = None
    statut_juridique: Optional[str] = Field(None, max_length=50)
    adresse: Optional[str] = Field(None, max_length=255)
    numero_ifu: Optional[str] = Field(None, max_length=13)
    numero_rccm: Optional[str] = Field(None, max_length=50)
    date_creation_entreprise: Optional[datetime] = None
    nom_responsable_entreprise: Optional[str] = Field(None, max_length=50)
    prenoms_responsable_entreprise: Optional[str] = Field(None, max_length=255)
    telephone_responsable_entreprise: Optional[str] = Field(None, max_length=20)
    logo: Optional[str] = Field(None, max_length=255)
    site_web: Optional[str] = Field(None, max_length=255)
    is_premium: Optional[bool] = None
    premium_activated_at: Optional[datetime] = None
    premium_expire_at: Optional[datetime] = None
    statut_compte: Optional[str] = None

class EntrepriseOut(EntrepriseBase):
    id: str
    id_utilisateur: str
    is_premium: bool
    premium_activated_at: Optional[datetime] = None
    premium_expire_at: Optional[datetime] = None
    statut_compte: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class EntrepriseDelete(BaseModel):
    id: str

# Plan Abonnement
class PlanAbonnementBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=40)
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    montant: Decimal = Field(..., ge=0)
    devise: str = Field(default="XOF", max_length=3)
    duree_jours: int = Field(..., gt=0)

class PlanAbonnementCreate(PlanAbonnementBase):
    pass

class PlanAbonnementUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=40)
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    montant: Optional[Decimal] = Field(None, ge=0)
    devise: Optional[str] = Field(None, max_length=3)
    duree_jours: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None

class PlanAbonnementOut(PlanAbonnementBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PlanAbonnementDelete(BaseModel):
    id: str

# Abonnement Entreprise
class AbonnementEntrepriseBase(BaseModel):
    id_entreprise: str
    id_plan_abonnement: str
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: str = Field(default="En attente")
    auto_renouvellement: bool = Field(default=False)

class AbonnementEntrepriseCreate(AbonnementEntrepriseBase):
    pass

class AbonnementEntrepriseUpdate(BaseModel):
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None
    auto_renouvellement: Optional[bool] = None

class AbonnementEntrepriseOut(AbonnementEntrepriseBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AbonnementEntrepriseDelete(BaseModel):
    id: str

# Paiement Abonnement
class PaiementAbonnementBase(BaseModel):
    id_abonnement: str
    id_utilisateur: Optional[str] = None
    montant: Decimal = Field(..., ge=0)
    devise: str = Field(default="XOF", max_length=3)
    mode_paiement: Optional[str] = Field(None, max_length=30)
    reference_transaction: Optional[str] = Field(None, max_length=100)
    statut: str = Field(default="En attente")

class PaiementAbonnementCreate(PaiementAbonnementBase):
    pass

class PaiementAbonnementUpdate(BaseModel):
    montant: Optional[Decimal] = Field(None, ge=0)
    devise: Optional[str] = Field(None, max_length=3)
    mode_paiement: Optional[str] = Field(None, max_length=30)
    reference_transaction: Optional[str] = Field(None, max_length=100)
    statut: Optional[str] = None
    paid_at: Optional[datetime] = None

class PaiementAbonnementOut(PaiementAbonnementBase):
    id: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PaiementAbonnementDelete(BaseModel):
    id: str

# Workspace
class WorkspaceBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    id_utilisateur: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

class WorkspaceOut(WorkspaceBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    id_utilisateur: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WorkspaceDelete(BaseModel):
    id: str

# Espace
class EspaceBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class EspaceCreate(EspaceBase):
    id_espace_parent: Optional[str] = None
    id_workspace: Optional[str] = None

class EspaceUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_espace_parent: Optional[str] = None
    id_workspace: Optional[str] = None

class EspaceOut(EspaceBase):
    id: str
    created_at: datetime
    id_espace_parent: Optional[str] = None
    id_workspace: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class EspaceDelete(BaseModel):
    id: str

# Liste
class ListeBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class ListeCreate(ListeBase):
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None

class ListeUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None

class ListeOut(ListeBase):
    id: str
    created_at: datetime
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ListeDelete(BaseModel):
    id: str

# Tache
class TacheBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin_prevue: Optional[datetime] = None
    date_fin_reelle: Optional[datetime] = None
    statut: str = Field(default="A faire")
    priorite: str = Field(default="Moyenne")
    progression: int = Field(default=0, ge=0, le=100)
    commentaires: Optional[str] = None

class TacheCreate(TacheBase):
    id_liste: Optional[str] = None

class TacheUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin_prevue: Optional[datetime] = None
    date_fin_reelle: Optional[datetime] = None
    statut: Optional[str] = None
    priorite: Optional[str] = None
    progression: Optional[int] = Field(None, ge=0, le=100)
    commentaires: Optional[str] = None
    id_liste: Optional[str] = None

class TacheOut(TacheBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    id_liste: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TacheDelete(BaseModel):
    id: str

# Membre
class MembreBase(BaseModel):
    id_utilisateur: str
    role: str = Field(default="Membre")
    statut: str = Field(default="Actif")

class MembreCreate(MembreBase):
    id_workspace: Optional[str] = None
    id_espace: Optional[str] = None
    id_liste: Optional[str] = None
    id_tache: Optional[str] = None

class MembreUpdate(BaseModel):
    role: Optional[str] = None
    statut: Optional[str] = None

class MembreOut(MembreBase):
    id: str
    date_ajout: datetime
    id_workspace: Optional[str] = None
    id_espace: Optional[str] = None
    id_liste: Optional[str] = None
    id_tache: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class MembreDelete(BaseModel):
    id: str

# Fichier
class FichierBase(BaseModel):
    nom_fichier: str = Field(..., min_length=1, max_length=255)
    chemin_fichier: str = Field(..., min_length=1, max_length=500)
    type_fichier: Optional[str] = Field(None, max_length=50)
    taille_fichier: Optional[int] = None

class FichierCreate(FichierBase):
    id_membre: Optional[str] = None

class FichierUpdate(BaseModel):
    nom_fichier: Optional[str] = Field(None, min_length=1, max_length=255)
    chemin_fichier: Optional[str] = Field(None, min_length=1, max_length=500)
    type_fichier: Optional[str] = Field(None, max_length=50)
    taille_fichier: Optional[int] = None
    id_membre: Optional[str] = None

class FichierOut(FichierBase):
    id: str
    date_upload: datetime
    id_membre: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FichierDelete(BaseModel):
    id: str

# Rapport
class RapportBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=255)
    contenu: Optional[str] = None
    periode_debut: Optional[datetime] = None
    periode_fin: Optional[datetime] = None

class RapportCreate(RapportBase):
    id_membre: Optional[str] = None

class RapportUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    contenu: Optional[str] = None
    periode_debut: Optional[datetime] = None
    periode_fin: Optional[datetime] = None
    id_membre: Optional[str] = None

class RapportOut(RapportBase):
    id: str
    created_at: datetime
    id_membre: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RapportDelete(BaseModel):
    id: str

# Absence Et Conge
class AbsenceEtCongeBase(BaseModel):
    type_absence: str
    date_debut: datetime
    date_fin: datetime
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    motif: Optional[str] = None
    commentaires: Optional[str] = None

class AbsenceEtCongeCreate(AbsenceEtCongeBase):
    id_membre: str

class AbsenceEtCongeUpdate(BaseModel):
    type_absence: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    motif: Optional[str] = None
    statut: Optional[str] = None
    commentaires: Optional[str] = None

class AbsenceEtCongeOut(AbsenceEtCongeBase):
    id: str
    statut: str
    created_at: datetime
    id_membre: str
    model_config = ConfigDict(from_attributes=True)

class AbsenceEtCongeDelete(BaseModel):
    id: str

# Canevas
class CanevasBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class CanevasCreate(CanevasBase):
    id_liste: Optional[str] = None

class CanevasUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_liste: Optional[str] = None

class CanevasOut(CanevasBase):
    id: str
    created_at: datetime
    id_liste: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CanevasDelete(BaseModel):
    id: str

# Section
class SectionBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    ordre: int = Field(default=1, ge=1)

class SectionCreate(SectionBase):
    id_canevas: Optional[str] = None

class SectionUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    ordre: Optional[int] = Field(None, ge=1)
    id_canevas: Optional[str] = None

class SectionOut(SectionBase):
    id: str
    created_at: datetime
    id_canevas: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SectionDelete(BaseModel):
    id: str

# Checklist
class ChecklistBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_checked: bool = Field(default=False)
    ordre: int = Field(default=1, ge=1)

class ChecklistCreate(ChecklistBase):
    id_section: Optional[str] = None
    id_tache: Optional[str] = None

class ChecklistUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_checked: Optional[bool] = None
    ordre: Optional[int] = Field(None, ge=1)
    id_section: Optional[str] = None
    id_tache: Optional[str] = None

class ChecklistOut(ChecklistBase):
    id: str
    created_at: datetime
    id_section: Optional[str] = None
    id_tache: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ChecklistDelete(BaseModel):
    id: str
