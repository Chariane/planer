from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models import HistoriqueConnexion


def record_user_disconnect(db: Session, user_id: str) -> None:
    """Persist the latest messaging disconnection as a durable last-seen signal."""
    if not user_id:
        return

    db.add(
        HistoriqueConnexion(
            id_utilisateur=user_id,
            date_connexion=datetime.utcnow(),
            date_deconnexion=datetime.utcnow(),
            est_reussi=True,
            navigateur="K-Planner Messagerie",
            appareil="websocket",
        )
    )
    db.commit()


def get_last_seen(db: Session, user_id: str) -> Optional[datetime]:
    if not user_id:
        return None

    return (
        db.query(HistoriqueConnexion.date_deconnexion)
        .filter(
            HistoriqueConnexion.id_utilisateur == user_id,
            HistoriqueConnexion.date_deconnexion.isnot(None),
        )
        .order_by(HistoriqueConnexion.date_deconnexion.desc())
        .limit(1)
        .scalar()
    )


def serialize_last_seen(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None
