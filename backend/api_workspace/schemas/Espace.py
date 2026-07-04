from .Base import BaseModel, ConfigDict, Field, List, Optional, datetime


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

EspaceTreeOut.model_rebuild()
