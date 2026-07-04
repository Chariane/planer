from typing import TYPE_CHECKING, Optional
import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Membre import Membre


class AbsenceEtConge(Base):
    __tablename__ = 'absence_et_conge'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='absence_et_conge_pkey'),
        CheckConstraint("statut::text = ANY (ARRAY['en_attente'::text, 'approuvee'::text, 'rejetee'::text, 'annulee'::text, 'terminee'::text])", name='absence_et_conge_statut_check'),
        CheckConstraint("date_fin IS NULL OR date_fin >= date_debut", name='absence_et_conge_date_fin_check'),
        CheckConstraint("duree_demandee_en_jours IS NULL OR duree_demandee_en_jours >= 0", name='absence_et_conge_duree_check'),
        Index('idx_absence_et_conge_membre', 'id_membre'),
        Index('idx_absence_et_conge_statut', 'statut'),
        Index('idx_absence_et_conge_date_debut', 'date_debut'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    is_absence: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    date_debut: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    statut: Mapped[str] = mapped_column(String(50), server_default=text("'en_attente'::character varying"))
    statut_date: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    motif: Mapped[Optional[str]] = mapped_column(String(255))
    is_conge_planifie: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    decision_commentaire: Mapped[Optional[str]] = mapped_column(Text)
    duree_demandee_en_jours: Mapped[Optional[int]] = mapped_column(Integer)
    id_membre: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.membre.id', ondelete='SET NULL'))
    
    # Relations
    membres: Mapped[Optional['Membre']] = relationship('Membre', back_populates='absences_et_conges')
