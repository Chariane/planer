from .Base import BaseModel, ConfigDict, Decimal, Field, Optional, datetime


class PlanAbonnementBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=40)
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    montant: Decimal = Field(..., ge=0)
    devise: str = Field(default="XOF", max_length=3)
    duree_jours: int = Field(..., gt=0)

class PlanAbonnementCreate(PlanAbonnementBase):
    is_active: Optional[bool] = True

class PlanAbonnementUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=40)
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    montant: Optional[Decimal] = Field(None, ge=0)
    devise: Optional[str] = Field(None, max_length=3)
    duree_jours: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None

class PlanAbonnementOut(PlanAbonnementBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PlanAbonnementDelete(BaseModel):
    id: str

# Abonnement Entreprise

class AbonnementEntrepriseBase(BaseModel):
    id_entreprise: str
    id_plan_abonnement: str
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: str = Field(default="En attente")
    auto_renouvellement: bool = Field(default=False)

class AbonnementEntrepriseCreate(AbonnementEntrepriseBase):
    pass

class AbonnementEntrepriseUpdate(BaseModel):
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None
    auto_renouvellement: Optional[bool] = None

class AbonnementEntrepriseOut(AbonnementEntrepriseBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AbonnementEntrepriseDelete(BaseModel):
    id: str

# Paiement Abonnement

class PaiementAbonnementBase(BaseModel):
    id_abonnement: str
    id_utilisateur: Optional[str] = None
    montant: Decimal = Field(..., ge=0)
    devise: str = Field(default="XOF", max_length=3)
    mode_paiement: Optional[str] = Field(None, max_length=30)
    reference_transaction: Optional[str] = Field(None, max_length=100)
    statut: str = Field(default="En attente")

class PaiementAbonnementCreate(PaiementAbonnementBase):
    pass

class PaiementAbonnementUpdate(BaseModel):
    montant: Optional[Decimal] = Field(None, ge=0)
    devise: Optional[str] = Field(None, max_length=3)
    mode_paiement: Optional[str] = Field(None, max_length=30)
    reference_transaction: Optional[str] = Field(None, max_length=100)
    statut: Optional[str] = None
    paid_at: Optional[datetime] = None

class PaiementAbonnementOut(PaiementAbonnementBase):
    id: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PaiementAbonnementDelete(BaseModel):
    id: str

# Workspace
