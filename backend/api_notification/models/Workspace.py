from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Espace import Espace
    from .Liste import Liste
    from .Membre import Membre
    from .Utilisateur import Utilisateur


class Workspace(Base):
    __tablename__ = 'workspace'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='workspace_pkey'),
        Index('idx_workspace_utilisateur', 'id_utilisateur'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    
    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='Workspace')
    espaces: Mapped[List['Espace']] = relationship('Espace', back_populates='workspace')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='workspace')
    listes: Mapped[List['Liste']] = relationship('Liste', back_populates='workspace')
