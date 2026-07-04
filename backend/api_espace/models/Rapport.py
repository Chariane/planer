from typing import TYPE_CHECKING, Optional
import datetime
from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Membre import Membre


class Rapport(Base):
    __tablename__ = 'rapport'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='rapport_pkey'),
        Index('idx_rapport_membre', 'id_membre'),
        Index('idx_rapport_periode_debut', 'periode_debut'),
        Index('idx_rapport_periode_fin', 'periode_fin'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(150))
    realisations: Mapped[Optional[str]] = mapped_column(Text)
    difficultes_et_solutions: Mapped[Optional[str]] = mapped_column(Text)
    commentaire: Mapped[Optional[str]] = mapped_column(Text)
    fichier_joint: Mapped[Optional[str]] = mapped_column(String(255))
    periode_debut: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    periode_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_membre: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.membre.id', ondelete='SET NULL'))

    # Relations
    membres: Mapped[Optional['Membre']] = relationship('Membre', back_populates='rapports')
