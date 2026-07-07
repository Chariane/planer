from .Base import BaseModel, ConfigDict, Field, Optional, datetime


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
