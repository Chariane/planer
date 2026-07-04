from typing import Optional
import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from .Base import Base


class Notification(Base):
    __tablename__ = 'notification'
    __table_args__ = (
        CheckConstraint("type::text = ANY (ARRAY['info'::character varying, 'alerte'::character varying, 'warning'::character varying, 'promotion'::character varying, 'evenement'::character varying, 'systeme'::character varying]::text[])", name='notification_type_check'),
        PrimaryKeyConstraint('id', name='notification_pkey'),
        {'schema': 'public'},
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("substring(md5(random()::text || clock_timestamp()::text), 1, 12)"))
    type: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(Text)
    est_lu: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    est_globale: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_lecture: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    id_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.publication.id', ondelete='SET NULL'))
    id_product: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='SET NULL'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='SET NULL'))
    id_commentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.commentaire.id', ondelete='SET NULL'))
    id_reponsecommentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.reponsecommentaire.id', ondelete='SET NULL'))
    id_message: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.message.id', ondelete='SET NULL'))
    id_groupe: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.groupe.id', ondelete='SET NULL'))
    id_reaction: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.reaction.id', ondelete='SET NULL'))
    id_historique_connexion: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.historique_connexion.id', ondelete='SET NULL'))
    id_mention: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.mention.id', ondelete='SET NULL'))
    id_suivi_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.suivi_utilisateur.id', ondelete='SET NULL'))
