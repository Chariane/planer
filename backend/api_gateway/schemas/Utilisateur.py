import base64
import re

from .Base import (
    Any,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    NAME_REGEX,
    Optional,
    PHONE_NUMBER_CLEANED_REGEX,
    USERNAME_REGEX,
    computed_field,
    date,
    datetime,
    field_validator,
    model_validator,
)


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


class EntrepriseRegistrationPayload(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    telephone: Optional[str] = Field(None, max_length=20)
    statut_juridique: Optional[str] = Field(None, max_length=255)
    adresse: Optional[str] = Field(None, max_length=255)
    numero_ifu: Optional[str] = Field(None, max_length=13)
    numero_rccm: Optional[str] = Field(None, max_length=50)
    date_creation_entreprise: Optional[date] = None
    nom_responsable_entreprise: Optional[str] = Field(None, max_length=50)
    prenoms_responsable_entreprise: Optional[str] = Field(None, max_length=255)
    telephone_responsable_entreprise: Optional[str] = Field(None, max_length=20)
    site_web: Optional[str] = Field(None, max_length=255)

    @model_validator(mode='before')
    @classmethod
    def clean_entreprise_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for key, value in list(data.items()):
                if isinstance(value, str):
                    cleaned = value.strip()
                    data[key] = cleaned or None
        return data


class UtilisateurCreate(UtilisateurBase):
    password: str
    is_active: Optional[bool] = True
    is_user: Optional[bool] = True
    is_admin: Optional[bool] = False
    is_super_admin: Optional[bool] = False
    is_livreur: Optional[bool] = False
    is_entreprise: Optional[bool] = False
    invitation_token: Optional[str] = None
    entreprise: Optional[EntrepriseRegistrationPayload] = None

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
    date_nais: Optional[date] = None
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
    date_nais: Optional[date] = None
    pays: Optional[str] = None
    ville: Optional[str] = None
    photo: Optional[bytes] = Field(default=None, exclude=True)
    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def photo_base64(self) -> Optional[str]:
        if not self.photo:
            return None
        return base64.b64encode(self.photo).decode("ascii")


class ProfilePhotoUpdate(BaseModel):
    photo_base64: Optional[str] = None


class ProfilePhotoResponse(BaseModel):
    photo_base64: Optional[str] = None
    mime_type: Optional[str] = None
    scan_status: Optional[str] = None


class PublicUserProfileOut(BaseModel):
    id: str
    username: str
    email: Optional[EmailStr] = None
    nom: Optional[str] = None
    prenoms: Optional[str] = None
    telephone: Optional[str] = None
    biographie: Optional[str] = None
    genre: Optional[str] = None
    pays: Optional[str] = None
    ville: Optional[str] = None
    photo_base64: Optional[str] = None


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
