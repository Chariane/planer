from .Base import BaseModel, ConfigDict, Field, Optional, datetime


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
