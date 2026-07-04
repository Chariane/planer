from .Base import BaseModel, ConfigDict, Field, Optional, datetime


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
