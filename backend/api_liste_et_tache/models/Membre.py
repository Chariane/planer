from typing import TYPE_CHECKING, List, Optional
import datetime

from sqlalchemy import CheckConstraint,  DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .Base import Base

if TYPE_CHECKING:
    from .AbsenceEtConge import AbsenceEtConge
    from .Espace import Espace
    from .Fichier import Fichier
    from .Liste import Liste
    from .Rapport import Rapport
    from .Tache import Tache
    from .Utilisateur import Utilisateur
    from .Workspace import Workspace


class Membre(Base):
    __tablename__ = 'membre'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='membre_pkey'),
        CheckConstraint("role::text = ANY (ARRAY['Créateur'::character varying, 'Administrateur'::character varying, 'Membre'::character varying, 'Invité'::character varying]::text[])", name='membre_role_check'),
        CheckConstraint("statut::text = ANY (ARRAY['Actif'::character varying, 'En attente'::character varying, 'Suspendu'::character varying, 'Quitté'::character varying]::text[])", name='membre_statut_check'),
        Index('idx_membre_utilisateur', 'id_utilisateur'),
        Index('idx_membre_workspace', 'id_workspace'),
        Index('idx_membre_espace', 'id_espace'),
        Index('idx_membre_liste', 'id_liste'),
        Index('idx_membre_tache', 'id_tache'),
        Index('idx_membre_role', 'role'),
        Index('idx_membre_statut', 'statut'),
        Index('idx_membre_workspace_unique', 'id_utilisateur', 'id_workspace', unique=True, postgresql_where=text('id_workspace IS NOT NULL')),
        Index('idx_membre_espace_unique', 'id_utilisateur', 'id_espace', unique=True, postgresql_where=text('id_espace IS NOT NULL')),
        Index('idx_membre_liste_unique', 'id_utilisateur', 'id_liste', unique=True, postgresql_where=text('id_liste IS NOT NULL')),
        Index('idx_membre_tache_unique', 'id_utilisateur', 'id_tache', unique=True, postgresql_where=text('id_tache IS NOT NULL')),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    role: Mapped[str] = mapped_column(String(30), server_default=text("'Membre'::character varying"))
    statut: Mapped[str] = mapped_column(String(30), server_default=text("'Actif'::character varying"))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    id_workspace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.workspace.id', ondelete='SET NULL'))
    id_espace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.espace.id', ondelete='SET NULL'))
    id_liste: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.liste.id', ondelete='SET NULL'))
    id_tache: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.tache.id', ondelete='SET NULL'))
    
    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='membres')
    workspace: Mapped[Optional['Workspace']] = relationship('Workspace', back_populates='membres')
    espace: Mapped[Optional['Espace']] = relationship('Espace', back_populates='membres')
    liste: Mapped[Optional['Liste']] = relationship('Liste', back_populates='membres')
    tache: Mapped[Optional['Tache']] = relationship('Tache', back_populates='membres')
    fichiers: Mapped[List['Fichier']] = relationship('Fichier', back_populates='membres')
    rapports: Mapped[List['Rapport']] = relationship('Rapport', back_populates='membres')
    absences_et_conges: Mapped[List['AbsenceEtConge']] = relationship('AbsenceEtConge', back_populates='membres')
