from .Base import BaseModel, ConfigDict, Field, Optional, datetime


class AbsenceEtCongeBase(BaseModel):
    is_absence: bool = Field(default=True)
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None   # Valeurs autorisées : 'en_attente', 'approuvee', 'rejetee', 'annulee', 'terminee'
    motif: Optional[str] = None
    is_conge_planifie: Optional[bool] = Field(default=False)
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    decision_commentaire: Optional[str] = None   # Stocke les infos de décision (qui, quand) + commentaire

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
    decision_commentaire: Optional[str] = None
    id_membre: Optional[str] = None

class AbsenceEtCongeOut(AbsenceEtCongeBase):
    id: str
    statut: str
    statut_date: datetime
    created_at: datetime
    id_membre: Optional[str] = None
    owner_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AbsenceEtCongeDelete(BaseModel):
    id: str

# Canevas
