from typing import TYPE_CHECKING, Optional
import datetime
from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Utilisateur import Utilisateur


class Motdepasseoublie(Base):
    __tablename__ = 'motdepasseoublie'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='motdepasseoublie_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    token_reinitialisation_mdp: Mapped[Optional[str]] = mapped_column(String(255))
    date_exp_token_reinitialisation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='motdepasseoublie')
