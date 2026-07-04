from .Base import BaseModel, ConfigDict, Field, Optional, datetime


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
    owner_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RapportDelete(BaseModel):
    id: str

class RapportWorkflowAction(BaseModel):
    commentaire: Optional[str] = None
