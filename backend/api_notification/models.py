import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .core.database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateur"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="utilisateur_pk"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True)
    username: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    nom: Mapped[Optional[str]] = mapped_column(String(100))
    prenoms: Mapped[Optional[str]] = mapped_column(String(100))
    is_admin: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    is_super_admin: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))


class Notification(Base):
    __tablename__ = "notification"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="notification_pkey"),
        {"schema": "notification"},
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    type: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(Text)
    est_lu: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("false"))
    est_globale: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("false"))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    date_lecture: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey("public.utilisateur.id", ondelete="SET NULL"))

    utilisateur: Mapped[Optional[Utilisateur]] = relationship("Utilisateur")
