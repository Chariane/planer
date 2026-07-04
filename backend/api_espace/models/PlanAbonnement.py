from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import Boolean, DateTime, Integer, Numeric, PrimaryKeyConstraint, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .AbonnementEntreprise import AbonnementEntreprise


class PlanAbonnement(Base):
    __tablename__ = 'plan_abonnement'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='plan_abonnement_pkey'),
        UniqueConstraint('code', name='plan_abonnement_code_key'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    code: Mapped[str] = mapped_column(String(40))
    nom: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    montant: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    devise: Mapped[str] = mapped_column(String(3), server_default=text("'XOF'::bpchar"))
    duree_jours: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    abonnements: Mapped[List['AbonnementEntreprise']] = relationship('AbonnementEntreprise', back_populates='plan_abonnement')
