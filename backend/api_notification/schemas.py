from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict
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
    delivery_address: Optional[str] = Field(None, min_length=5, max_length=200)
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
# 🗂 ESPACES
# ----------------------------------------

class EspaceBase(BaseModel):
    nom: str
    description: Optional[str] = None

class EspaceCreate(EspaceBase):
    pass

class EspaceUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None

class EspaceOut(EspaceBase):
    id: str
    id_workspace: Optional[str] = None
    id_espace_parent: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------
# 👥 MEMBRES
# ----------------------------------------

class MembreBase(BaseModel):
    role: str
    statut: str

class MembreCreate(MembreBase):
    id_utilisateur: str

class MembreUpdate(BaseModel):
    role: Optional[str] = None
    statut: Optional[str] = None

class MembreOut(MembreBase):
    id: str
    id_utilisateur: Optional[str] = None
    id_workspace: Optional[str] = None
    id_espace: Optional[str] = None
    id_liste: Optional[str] = None
    id_tache: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FichierBase(BaseModel):
    nom: str
    type_fichier: str
    meta_donnees: Optional[Dict] = None

class FichierCreate(FichierBase):
    url_fichier: str
    id_membre: str

class FichierUpdate(BaseModel):
    nom: Optional[str] = None
    type_fichier: Optional[str] = None
    meta_donnees: Optional[Dict] = None
    url_fichier: Optional[str] = None

class FichierOut(FichierBase):
    id: str
    url_fichier: str
    id_membre: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NotificationBase(BaseModel):
    type: str
    message: str
    est_globale: bool = False

class NotificationOut(NotificationBase):
    id: str
    est_lu: bool
    date_creation: datetime
    date_lecture: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class NotificationUpdate(BaseModel):
    est_lu: Optional[bool] = None