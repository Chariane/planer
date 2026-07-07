from typing import TYPE_CHECKING, Optional
import datetime
from sqlalchemy import DateTime, ForeignKey, Index, Numeric, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .AbonnementEntreprise import AbonnementEntreprise
    from .Utilisateur import Utilisateur


class PaiementAbonnement(Base):
    __tablename__ = 'paiement_abonnement'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='paiement_abonnement_pkey'),
        Index('idx_paiement_abonnement_id', 'id_abonnement'),
        Index('idx_paiement_abonnement_statut', 'statut'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_abonnement: Mapped[str] = mapped_column(String(12), ForeignKey('planer.abonnement_entreprise.id', ondelete='CASCADE'))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    montant: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    devise: Mapped[str] = mapped_column(String(3), server_default=text("'XOF'::bpchar"))
    mode_paiement: Mapped[Optional[str]] = mapped_column(String(30))
    reference_transaction: Mapped[Optional[str]] = mapped_column(String(100))
    statut: Mapped[str] = mapped_column(String(20), server_default=text("'En attente'::character varying"))
    paid_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    
    # Relations
    abonnement: Mapped['AbonnementEntreprise'] = relationship('AbonnementEntreprise', back_populates='paiements')
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='paiements_abonnement')
