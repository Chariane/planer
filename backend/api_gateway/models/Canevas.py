from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, PrimaryKeyConstraint, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Liste import Liste
    from .Section import Section


class Canevas(Base):
    __tablename__ = 'canevas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='canevas_pkey'),
        UniqueConstraint('id_liste', name='canevas_id_liste_key'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    is_verrouille: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_liste: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.liste.id', ondelete='SET NULL'), unique=True)
    
    # Relations
    liste: Mapped[Optional['Liste']] = relationship('Liste', back_populates='canevas')
    sections: Mapped[List['Section']] = relationship('Section', back_populates='canevas')
