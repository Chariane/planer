from typing import TYPE_CHECKING, Optional
import datetime
from sqlalchemy import  DateTime, ForeignKey, Index, JSON, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Membre import Membre


class Fichier(Base):
    __tablename__ = 'fichier'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='fichier_pkey'),
        Index('idx_fichier_membre', 'id_membre'),
        Index('idx_fichier_type_fichier', 'type_fichier'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(255))
    url_fichier: Mapped[Optional[str]] = mapped_column(String(255))
    type_fichier: Mapped[Optional[str]] = mapped_column(String(20))
    meta_donnees: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_membre: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.membre.id', ondelete='SET NULL'))

    # Relations
    membres: Mapped[Optional['Membre']] = relationship('Membre', back_populates='fichiers')
