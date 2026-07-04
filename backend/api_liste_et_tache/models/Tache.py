from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, SmallInteger, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Checklist import Checklist
    from .Liste import Liste
    from .Membre import Membre


class Tache(Base):
    __tablename__ = 'tache'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tache_pkey'),
        Index('idx_tache_liste', 'id_liste'),
        Index('idx_tache_statut', 'statut'),
        Index('idx_tache_priorite', 'priorite'),
        Index('idx_tache_date_fin_prevue', 'date_fin_prevue'),
        Index('idx_tache_parent', 'id_tache_parent'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    date_debut: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    date_fin_prevue: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    statut: Mapped[str] = mapped_column(String(50))
    statut_date: Mapped[datetime.datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    priorite: Mapped[Optional[str]] = mapped_column(String(50))
    ordre_affichage: Mapped[Optional[int]] = mapped_column(SmallInteger)
    id_liste: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.liste.id', ondelete='SET NULL'))
    id_tache_parent: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.tache.id', ondelete='CASCADE'))
    
    # Relations
    liste: Mapped[Optional['Liste']] = relationship('Liste', back_populates='taches')
    parent: Mapped[Optional['Tache']] = relationship('Tache', remote_side=[id], back_populates='sous_taches')
    sous_taches: Mapped[List['Tache']] = relationship('Tache', back_populates='parent')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='tache')
    checklists: Mapped[List['Checklist']] = relationship('Checklist', back_populates='tache')
