from typing import TYPE_CHECKING, List, Optional
import datetime
from sqlalchemy import  CheckConstraint, DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .Canevas import Canevas
    from .Espace import Espace
    from .Membre import Membre
    from .Tache import Tache
    from .Workspace import Workspace


class Liste(Base):
    __tablename__ = 'liste'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='liste_pkey'),
        CheckConstraint("num_nonnulls(id_espace, id_workspace) = 1", name='liste_cible_unique_check'),
        Index('idx_liste_espace', 'id_espace'),
        Index('idx_liste_workspace', 'id_workspace'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(150))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_espace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.espace.id', ondelete='SET NULL'))
    id_workspace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.workspace.id', ondelete='SET NULL'))

    # Relations
    espace: Mapped[Optional['Espace']] = relationship('Espace', back_populates='listes')
    workspace: Mapped[Optional['Workspace']] = relationship('Workspace', back_populates='listes')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='liste')
    taches: Mapped[List['Tache']] = relationship('Tache', back_populates='liste')
    canevas: Mapped[Optional['Canevas']] = relationship('Canevas', back_populates='liste', uselist=False)
