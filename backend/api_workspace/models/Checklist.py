from typing import TYPE_CHECKING, Optional
import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Section import Section
    from .Tache import Tache


class Checklist(Base):
    __tablename__ = 'checklist'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='checklist_pkey'),
        Index('idx_checklist_section', 'id_section'),
        Index('idx_checklist_tache', 'id_tache'),
        Index('idx_checklist_is_checked', 'is_checked'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    texte: Mapped[str] = mapped_column(String(255))
    is_checked: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_section: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.section.id', ondelete='SET NULL'))
    id_tache: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.tache.id', ondelete='SET NULL'))
    
    # Relations
    section: Mapped[Optional['Section']] = relationship('Section', back_populates='checklists')
    tache: Mapped[Optional['Tache']] = relationship('Tache', back_populates='checklists')
