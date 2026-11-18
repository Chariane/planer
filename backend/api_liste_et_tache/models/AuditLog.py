from typing import Optional
import datetime
from sqlalchemy import DateTime, Index, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from .Base import Base


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='audit_logs_pkey'),
        Index('idx_audit_logs_user', 'user_id'),
        Index('idx_audit_logs_action', 'action'),
        Index('idx_audit_logs_resource', 'resource_type', 'resource_id'),
        Index('idx_audit_logs_timestamp', 'timestamp'),
        Index('idx_audit_logs_workspace', 'workspace_id'),
        Index('idx_audit_logs_espace', 'espace_id'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    user_id: Mapped[Optional[str]] = mapped_column(String(255))
    user_name: Mapped[Optional[str]] = mapped_column(String(255))
    user_email: Mapped[Optional[str]] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(100))
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[Optional[str]] = mapped_column(String(255))
    resource_name: Mapped[Optional[str]] = mapped_column(String(255))
    workspace_id: Mapped[Optional[str]] = mapped_column(String(255))
    espace_id: Mapped[Optional[str]] = mapped_column(String(255))
    ip_address: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), server_default=text("'SUCCESS'::character varying"))
    details: Mapped[Optional[str]] = mapped_column(Text)
