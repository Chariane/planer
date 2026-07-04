from .Base import BaseModel, ConfigDict, Field, Optional, datetime


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
