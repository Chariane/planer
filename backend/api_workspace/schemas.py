from typing import Optional, List, Any
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator, field_validator
import re
from datetime import date, datetime

PHONE_NUMBER_CLEANED_REGEX = r"^\+?\d{7,20}$"
NAME_REGEX = r"^[a-zA-ZÀ-ÿ\s'-]+$"
USERNAME_REGEX = r"^[a-zA-Z0-9_.-]+$"
WORKSPACE_ASSIGNABLE_ROLES = {"Administrateur", "Membre", "Invité"}

TACHE_STATUSES = {"en attente", "en cours", "terminé", "bloqué"}
TACHE_PRIORITIES = {"basse", "moyenne", "haute", "critique"}

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
    def clean_user_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for optional_text_field in [
                "nom",
                "prenoms",
                "telephone",
                "delivery_address",
                "pays",
                "ville",
                "biographie",
                "genre",
            ]:
                if optional_text_field in data and isinstance(data.get(optional_text_field), str):
                    cleaned_value = data[optional_text_field].strip()
                    data[optional_text_field] = cleaned_value or None

            if data.get('email'):
                data['email'] = str(data['email']).strip().lower()

            if data.get('username'):
                data['username'] = str(data['username']).strip()

            if data.get('telephone'):
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
    password: str
    is_active: Optional[bool] = True
    is_user: Optional[bool] = True
    is_admin: Optional[bool] = False
    is_super_admin: Optional[bool] = False
    is_livreur: Optional[bool] = False
    is_entreprise: Optional[bool] = False

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        return value


class SuperAdminUtilisateurCreate(UtilisateurBase):
    password: str
    is_active: bool = True
    is_user: bool = True
    is_admin: bool = False
    is_super_admin: bool = False
    is_livreur: bool = False
    is_entreprise: bool = False

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        return value

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

    @model_validator(mode='before')
    @classmethod
    def clean_user_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for optional_text_field in [
                "nom",
                "prenoms",
                "telephone",
                "delivery_address",
                "pays",
                "ville",
                "biographie",
                "genre",
            ]:
                if optional_text_field in data and isinstance(data.get(optional_text_field), str):
                    cleaned_value = data[optional_text_field].strip()
                    data[optional_text_field] = cleaned_value or None

            if data.get('email'):
                data['email'] = str(data['email']).strip().lower()

            if data.get('username'):
                data['username'] = str(data['username']).strip()

            if data.get('telephone'):
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

class UtilisateurOut(UtilisateurBase):
    id: str
    is_active: bool
    is_utilisateur_verifie: bool
    is_2fa_enabled: bool
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

class EmailSchema(BaseModel):
    email: List[EmailStr]

class EmailVerificationCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code doit contenir exactement 6 chiffres.")
        return code


class EmailVerificationResendRequest(BaseModel):
    email: EmailStr

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data


class MessageResponse(BaseModel):
    message: str


class RegisterResponse(BaseModel):
    message: str
    user: UtilisateurOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code de reinitialisation doit contenir exactement 6 chiffres.")
        return code


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)


class GoogleAuthenticatorSetupResponse(MessageResponse):
    setup_required: bool = True
    is_2fa_enabled: bool = False
    google_auth_configured_at: Optional[datetime] = None
    google_authenticator_secret: Optional[str] = None
    google_authenticator_otpauth_url: Optional[str] = None


class GoogleAuthenticatorStatusResponse(MessageResponse):
    setup_required: bool
    is_2fa_enabled: bool
    google_auth_configured_at: Optional[datetime] = None


class TwoFactorEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code Google Authenticator doit contenir exactement 6 chiffres.")
        return code


class TwoFactorDisableRequest(BaseModel):
    current_password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)

    @model_validator(mode="before")
    @classmethod
    def normalize_identifier(cls, data: Any) -> Any:
        if isinstance(data, dict):
            identifier = data.get("identifier") or data.get("email") or data.get("username")
            if identifier is not None:
                normalized_identifier = str(identifier).strip()
                if "@" in normalized_identifier:
                    normalized_identifier = normalized_identifier.lower()
                data["identifier"] = normalized_identifier
        return data


class LoginResponse(MessageResponse):
    requires_2fa: bool = False
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UtilisateurOut] = None
    challenge_token: Optional[str] = None
    setup_required: bool = False
    google_authenticator_secret: Optional[str] = None
    google_authenticator_otpauth_url: Optional[str] = None


class LoginChallengeResponse(MessageResponse):
    requires_2fa: bool = True
    challenge_token: str
    setup_required: bool = False
    google_authenticator_secret: Optional[str] = None
    google_authenticator_otpauth_url: Optional[str] = None


class TwoFactorVerifyRequest(BaseModel):
    challenge_token: str
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code Google Authenticator doit contenir exactement 6 chiffres.")
        return code

# ----------------------------------------
# SCHÉMAS POUR LES RÔLES
# ----------------------------------------

class UserRolesUpdate(BaseModel):
    is_admin: Optional[bool] = None
    is_super_admin: Optional[bool] = None
    is_livreur: Optional[bool] = None
    is_entreprise: Optional[bool] = None
    is_user: Optional[bool] = None

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
    date_creation_entreprise: Optional[date] = None
    nom_responsable_entreprise: Optional[str] = Field(None, max_length=50)
    prenoms_responsable_entreprise: Optional[str] = Field(None, max_length=255)
    telephone_responsable_entreprise: Optional[str] = Field(None, max_length=20)
    logo: Optional[str] = Field(None, max_length=255)
    site_web: Optional[str] = Field(None, max_length=255)

class EntrepriseCreate(EntrepriseBase):
    id_utilisateur: Optional[str] = None

class EntrepriseUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    telephone: Optional[str] = None
    statut_juridique: Optional[str] = Field(None, max_length=50)
    adresse: Optional[str] = Field(None, max_length=255)
    numero_ifu: Optional[str] = Field(None, max_length=13)
    numero_rccm: Optional[str] = Field(None, max_length=50)
    date_creation_entreprise: Optional[date] = None
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
    is_active: Optional[bool] = True

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


class WorkspaceWithContextOut(WorkspaceOut):
    member_count: int = 0
    current_user_role: Optional[str] = None
    current_user_statut: Optional[str] = None


class RegisterWithWorkspaceResponse(BaseModel):
    message: str
    user: UtilisateurOut
    workspace: WorkspaceOut


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


class EspaceTreeOut(EspaceOut):
    sous_espaces: List["EspaceTreeOut"] = []


class EspaceDelete(BaseModel):
    id: str

# Liste
class ListeBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class ListeCreate(ListeBase):
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None

    @model_validator(mode="after")
    def validate_scope(self):
        if (self.id_espace is None) == (self.id_workspace is None):
            raise ValueError(
                "Une liste doit etre rattachee soit a un espace, soit a un workspace, jamais aux deux."
            )
        return self

class ListeUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def validate_scope_update(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        has_id_espace = "id_espace" in data
        has_id_workspace = "id_workspace" in data

        if not has_id_espace and not has_id_workspace:
            return data

        id_espace = data.get("id_espace")
        id_workspace = data.get("id_workspace")

        if (id_espace is None) == (id_workspace is None):
            raise ValueError(
                "Pour modifier le rattachement d'une liste, fournissez soit id_espace, soit id_workspace, jamais les deux."
            )
        return data

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
    statut: str = Field(default="en attente")
    priorite: str = Field(default="moyenne")
    ordre_affichage: Optional[int] = Field(None, ge=0)

    @field_validator("statut")
    @classmethod
    def validate_statut(cls, v: str) -> str:
        if v not in TACHE_STATUSES:
            allowed = ", ".join(TACHE_STATUSES)
            raise ValueError(f"Statut invalide. Valeurs autorisees : {allowed}")
        return v

    @field_validator("priorite")
    @classmethod
    def validate_priorite(cls, v: str) -> str:
        if v not in TACHE_PRIORITIES:
            allowed = ", ".join(TACHE_PRIORITIES)
            raise ValueError(f"Priorite invalide. Valeurs autorisees : {allowed}")
        return v

class TacheCreate(TacheBase):
    id_liste: Optional[str] = None

class TacheUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin_prevue: Optional[datetime] = None
    statut: Optional[str] = None
    priorite: Optional[str] = None
    ordre_affichage: Optional[int] = Field(None, ge=0)
    id_liste: Optional[str] = None

    @field_validator("statut")
    @classmethod
    def validate_statut_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TACHE_STATUSES:
            allowed = ", ".join(TACHE_STATUSES)
            raise ValueError(f"Statut invalide. Valeurs autorisees : {allowed}")
        return v

    @field_validator("priorite")
    @classmethod
    def validate_priorite_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TACHE_PRIORITIES:
            allowed = ", ".join(TACHE_PRIORITIES)
            raise ValueError(f"Priorite invalide. Valeurs autorisees : {allowed}")
        return v

class TacheOut(TacheBase):
    id: str
    statut_date: Optional[datetime] = None
    created_at: datetime
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

    @model_validator(mode="after")
    def validate_single_target(self):
        targets = [self.id_workspace, self.id_espace, self.id_liste, self.id_tache]
        non_null_count = sum(1 for t in targets if t is not None)
        if non_null_count != 1:
            raise ValueError(
                "Un membre doit etre rattache a exactement UNE ressource "
                "(workspace, espace, liste ou tache)."
            )
        return self

class MembreUpdate(BaseModel):
    role: Optional[str] = None
    statut: Optional[str] = None

class MembreOut(MembreBase):
    id: str
    created_at: datetime
    id_workspace: Optional[str] = None
    id_espace: Optional[str] = None
    id_liste: Optional[str] = None
    id_tache: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberUserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    nom: Optional[str] = None
    prenoms: Optional[str] = None


class WorkspaceMemberOut(MembreOut):
    utilisateur: Optional[WorkspaceMemberUserOut] = None


class EspaceMemberUserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    nom: Optional[str] = None
    prenoms: Optional[str] = None


class EspaceMemberOut(MembreOut):
    utilisateur: Optional[EspaceMemberUserOut] = None


class MembreDelete(BaseModel):
    id: str


class WorkspaceMemberInvite(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern=USERNAME_REGEX)
    role: str = Field(...)
    id_liste: Optional[str] = Field(None, min_length=12, max_length=12)
    id_tache: Optional[str] = Field(None, min_length=12, max_length=12)
 
 
    @model_validator(mode="before")
    @classmethod
    def normalize_invitation_target(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("email"):
                data["email"] = str(data["email"]).strip().lower()
            if data.get("username"):
                data["username"] = str(data["username"]).strip()
            for field_name in ["id_liste", "id_tache"]:
                if isinstance(data.get(field_name), str):
                    cleaned_value = data[field_name].strip()
                    data[field_name] = cleaned_value or None
        return data

    @model_validator(mode="after")
    def validate_target(self):
        if not self.email and not self.username:
            raise ValueError("Fournissez l'email ou le username de l'utilisateur a inviter.")
        if self.id_liste is not None or self.id_tache is not None:
            raise ValueError(
                "Une invitation workspace ne peut pas cibler directement une liste ou une tache."
            )
        return self

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        role = value.strip()
        if role not in WORKSPACE_ASSIGNABLE_ROLES:
            allowed_roles = ", ".join(sorted(WORKSPACE_ASSIGNABLE_ROLES))
            raise ValueError(f"Role invalide. Valeurs autorisees: {allowed_roles}.")
        return role
 
 
class WorkspaceInvitationResponse(BaseModel):
    status: str # "existing_user" or "guest_invitation"
    message: str
    email: str
    membre: Optional[WorkspaceMemberOut] = None
    token: Optional[str] = None


class WorkspaceMemberUpdate(BaseModel):
    role: Optional[str] = None
    statut: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        role = value.strip()
        if role not in WORKSPACE_ASSIGNABLE_ROLES:
            allowed_roles = ", ".join(sorted(WORKSPACE_ASSIGNABLE_ROLES))
            raise ValueError(f"Role invalide. Valeurs autorisees: {allowed_roles}.")
        return role

    @field_validator("statut")
    @classmethod
    def validate_statut(cls, value: Optional[str]) -> Optional[str]:
        allowed_statuses = {"Actif", "En attente", "Suspendu", "Quitté"}
        if value is None:
            return value
        statut = value.strip()
        if statut not in allowed_statuses:
            allowed = ", ".join(sorted(allowed_statuses))
            raise ValueError(f"Statut invalide. Valeurs autorisees: {allowed}.")
        return statut


class WorkspaceInvitationAcceptRequest(BaseModel):
    token: str = Field(..., min_length=10)


class EspaceInvitationAcceptRequest(BaseModel):
    token: str = Field(..., min_length=10)

# Fichier
class FichierBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    url_fichier: Optional[str] = None
    type_fichier: Optional[str] = Field(None, max_length=20)
    meta_donnees: Optional[dict] = None

class FichierCreate(FichierBase):
    id_membre: Optional[str] = None

class FichierUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=255)
    url_fichier: Optional[str] = None
    type_fichier: Optional[str] = Field(None, max_length=20)
    meta_donnees: Optional[dict] = None
    id_membre: Optional[str] = None

class FichierOut(FichierBase):
    id: str
    created_at: datetime
    id_membre: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FichierDelete(BaseModel):
    id: str

# Rapport
class RapportBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=150)
    realisations: Optional[str] = None
    difficultes_et_solutions: Optional[str] = None
    commentaire: Optional[str] = None
    fichier_joint: Optional[str] = None
    periode_debut: Optional[datetime] = None
    periode_fin: Optional[datetime] = None

class RapportCreate(RapportBase):
    id_membre: Optional[str] = None

class RapportUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=150)
    realisations: Optional[str] = None
    difficultes_et_solutions: Optional[str] = None
    commentaire: Optional[str] = None
    fichier_joint: Optional[str] = None
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
    is_absence: bool = Field(default=True)
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None
    motif: Optional[str] = None
    is_conge_planifie: Optional[bool] = Field(default=False)
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    conge_interrompu_at: Optional[datetime] = None

class AbsenceEtCongeCreate(AbsenceEtCongeBase):
    id_membre: Optional[str] = None

class AbsenceEtCongeUpdate(BaseModel):
    is_absence: Optional[bool] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None
    motif: Optional[str] = None
    is_conge_planifie: Optional[bool] = None
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    conge_interrompu_at: Optional[datetime] = None
    id_membre: Optional[str] = None

class AbsenceEtCongeOut(AbsenceEtCongeBase):
    id: str
    statut: str
    statut_date: datetime
    created_at: datetime
    id_membre: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AbsenceEtCongeDelete(BaseModel):
    id: str

# Canevas
class CanevasBase(BaseModel):
    is_verrouille: bool = Field(default=False)

class CanevasCreate(CanevasBase):
    id_liste: Optional[str] = None

class CanevasUpdate(BaseModel):
    is_verrouille: Optional[bool] = None
    id_liste: Optional[str] = None

class CanevasOut(CanevasBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    id_liste: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CanevasDelete(BaseModel):
    id: str

# Section
class SectionBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=150)

class SectionCreate(SectionBase):
    id_canevas: Optional[str] = None

class SectionUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=150)
    id_canevas: Optional[str] = None

class SectionOut(SectionBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    id_canevas: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SectionDelete(BaseModel):
    id: str

# Checklist
class ChecklistBase(BaseModel):
    texte: str = Field(..., min_length=1, max_length=255)
    is_checked: bool = Field(default=False)

class ChecklistCreate(ChecklistBase):
    id_section: Optional[str] = None
    id_tache: Optional[str] = None

class ChecklistUpdate(BaseModel):
    texte: Optional[str] = Field(None, min_length=1, max_length=255)
    is_checked: Optional[bool] = None
    id_section: Optional[str] = None
    id_tache: Optional[str] = None

class ChecklistOut(ChecklistBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    id_section: Optional[str] = None
    id_tache: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ChecklistDelete(BaseModel):
    id: str

EspaceTreeOut.model_rebuild()
