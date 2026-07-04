from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import  DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Canevas import Canevas
    from .Checklist import Checklist


class Section(Base):
    __tablename__ = 'section'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='section_pkey'),
        Index('idx_section_canevas', 'id_canevas'),
        Index('idx_section_titre', 'titre'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(150))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_canevas: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.canevas.id', ondelete='SET NULL'))

    # Relations
    canevas: Mapped[Optional['Canevas']] = relationship('Canevas', back_populates='sections')
    checklists: Mapped[List['Checklist']] = relationship('Checklist', back_populates='section')
