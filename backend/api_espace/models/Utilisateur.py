from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Index, LargeBinary, PrimaryKeyConstraint, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Membre import Membre
    from .PaiementAbonnement import PaiementAbonnement
    from .PlanerEntreprise import PlanerEntreprise
    from .Workspace import Workspace


class Utilisateur(Base):
    __tablename__ = 'utilisateur'
    __table_args__ = (
        CheckConstraint("badge::text = ANY (ARRAY['Aucun'::character varying, 'Bronze'::character varying, 'Argent'::character varying, 'Or'::character varying, 'Platine'::character varying, 'Diamant'::character varying]::text[])", name='utilisateur_badge_check'),
        CheckConstraint("genre::text = ANY (ARRAY['Homme'::character varying, 'Femme'::character varying, 'Autre'::character varying]::text[])", name='utilisateur_genre_check'),
        CheckConstraint("length(email::text) <= 255 AND email::text ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'::text", name='utilisateur_constr_email_check'),
        CheckConstraint("statut::text = ANY (ARRAY['Actif'::character varying, 'Suspendu'::character varying, 'Supprimé'::character varying]::text[])", name='utilisateur_constr_statut'),
        CheckConstraint("type_compte::text = ANY (ARRAY['Utilisateur'::character varying, 'Premium'::character varying]::text[])", name='utilisateur_type_compte_check'),
        CheckConstraint("type_compte::text <> 'Premium'::text OR premium_expire_at IS NOT NULL", name='utilisateur_premium_expire_check'),
        PrimaryKeyConstraint('id', name='utilisateur_pk'),
        UniqueConstraint('email', name='utilisateur_constr_email'),
        Index('idx_utilisateur_email', 'email'),
        Index('idx_utilisateur_username', 'username'),
        {'schema': 'public'},
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    username: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(100))
    statut: Mapped[str] = mapped_column(String(20), server_default=text("'Actif'::character varying"))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    is_utilisateur_verifie: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_livreur: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_user: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    is_entreprise: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_admin: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_super_admin: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    type_compte: Mapped[str] = mapped_column(String(20), server_default=text("'Utilisateur'::character varying"))
    premium_expire_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    nom: Mapped[Optional[str]] = mapped_column(String(100))
    prenoms: Mapped[Optional[str]] = mapped_column(String(100))
    mot_de_passe: Mapped[Optional[str]] = mapped_column(String(255))
    email_verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    token_confirmation_email: Mapped[Optional[str]] = mapped_column(String(255))
    date_exp_token_confirmation_email: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    genre: Mapped[Optional[str]] = mapped_column(String(10))
    photo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    date_nais: Mapped[Optional[datetime.date]] = mapped_column(Date)
    pays: Mapped[Optional[str]] = mapped_column(String(100))
    ville: Mapped[Optional[str]] = mapped_column(String(100))
    telephone: Mapped[Optional[str]] = mapped_column(String(20))
    biographie: Mapped[Optional[str]] = mapped_column(Text)
    otp_code: Mapped[Optional[str]] = mapped_column(String(5))
    code_verification_email: Mapped[Optional[str]] = mapped_column(String(6))
    date_exp_code_verification_email: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    google_auth_secret: Mapped[Optional[str]] = mapped_column(String(64))
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    google_auth_configured_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    badge: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Aucun'::character varying"))
    delivery_address: Mapped[Optional[str]] = mapped_column(String(255))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relations Planer uniquement.
    planer_entreprise: Mapped[Optional['PlanerEntreprise']] = relationship('PlanerEntreprise', back_populates='utilisateur', uselist=False)
    Workspace: Mapped[List['Workspace']] = relationship('Workspace', back_populates='utilisateur')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='utilisateur')
    paiements_abonnement: Mapped[List['PaiementAbonnement']] = relationship('PaiementAbonnement', back_populates='utilisateur')
