from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .PaiementAbonnement import PaiementAbonnement
    from .PlanAbonnement import PlanAbonnement
    from .PlanerEntreprise import PlanerEntreprise


class AbonnementEntreprise(Base):
    __tablename__ = 'abonnement_entreprise'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='abonnement_entreprise_pkey'),
        Index('idx_abonnement_entreprise_id', 'id_entreprise'),
        Index('idx_abonnement_plan_id', 'id_plan_abonnement'),
        Index('idx_abonnement_statut_date_fin', 'statut', 'date_fin'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('planer.entreprise.id', ondelete='CASCADE'))
    id_plan_abonnement: Mapped[str] = mapped_column(String(12), ForeignKey('planer.plan_abonnement.id', ondelete='RESTRICT'))
    date_debut: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_fin: Mapped[datetime.datetime] = mapped_column(DateTime)
    statut: Mapped[str] = mapped_column(String(20), server_default=text("'En attente'::character varying"))
    auto_renouvellement: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    
    # Relations
    entreprise: Mapped['PlanerEntreprise'] = relationship('PlanerEntreprise', back_populates='abonnements')
    plan_abonnement: Mapped['PlanAbonnement'] = relationship('PlanAbonnement', back_populates='abonnements')
    paiements: Mapped[List['PaiementAbonnement']] = relationship('PaiementAbonnement', back_populates='abonnement')
