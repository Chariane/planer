from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .AbonnementEntreprise import AbonnementEntreprise
    from .Utilisateur import Utilisateur


class PlanerEntreprise(Base):
    __tablename__ = 'entreprise'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='entreprise_pkey'),
        Index('idx_planer_entreprise_utilisateur', 'id_utilisateur'),
        UniqueConstraint('numero_ifu', name='entreprise_constr_numero_ifu'),
        UniqueConstraint('numero_rccm', name='entreprise_constr_numero_rccm'),
        UniqueConstraint('id_utilisateur', name='planer_entreprise_utilisateur_uq'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    statut_juridique: Mapped[Optional[str]] = mapped_column(String(255))
    adresse: Mapped[Optional[str]] = mapped_column(String(255))
    telephone: Mapped[Optional[str]] = mapped_column(String(20))
    numero_ifu : Mapped[Optional[str]] = mapped_column(String(13))
    numero_rccm: Mapped[Optional[str]] = mapped_column(String(50))
    nom_responsable_entreprise: Mapped[Optional[str]] = mapped_column(String(50))
    prenoms_responsable_entreprise: Mapped[Optional[str]] = mapped_column(String(255))
    telephone_responsable_entreprise: Mapped[Optional[str]] = mapped_column(String(20))
    site_web: Mapped[Optional[str]] = mapped_column(String(255))
    logo: Mapped[Optional[str]] = mapped_column(String(255))
    date_creation_entreprise: Mapped[Optional[datetime.date]] = mapped_column(Date)
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    is_premium: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    premium_activated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    premium_expire_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    statut_compte: Mapped[str] = mapped_column(String(20), server_default=text("'Actif'::character varying"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    
    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='planer_entreprise')
    abonnements: Mapped[List['AbonnementEntreprise']] = relationship('AbonnementEntreprise', back_populates='entreprise')
