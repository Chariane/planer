from .Base import BaseModel, ConfigDict, Field, Optional, date, datetime


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
