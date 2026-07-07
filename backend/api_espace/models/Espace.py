from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Liste import Liste
    from .Membre import Membre
    from .Workspace import Workspace


class Espace(Base):
    __tablename__ = 'espace'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='espace_pkey'),
        Index('idx_espace_parent', 'id_espace_parent'),
        Index('idx_espace_workspace', 'id_workspace'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(150))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_espace_parent: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.espace.id', ondelete='SET NULL'))
    id_workspace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.workspace.id', ondelete='SET NULL'))
    
    # Relations
    espace_parent: Mapped[Optional['Espace']] = relationship('Espace', remote_side='Espace.id', back_populates='sous_espaces')
    sous_espaces: Mapped[List['Espace']] = relationship('Espace', back_populates='espace_parent')
    workspace: Mapped[Optional['Workspace']] = relationship('Workspace', back_populates='espaces')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='espace')
    listes: Mapped[List['Liste']] = relationship('Liste', back_populates='espace')
