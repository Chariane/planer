import os
import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from .security import config_data
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Set up logging for persistent debugging
logging.basicConfig(
    filename=os.path.join(BASE_DIR, 'email_debug.log'),
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True
)
logger = logging.getLogger(__name__)


# -----------------------------
# Utilitaires de configuration
# -----------------------------

def _clean_env_val(key: str, default: str = "") -> str:
    """Nettoie une valeur d'environnement (supprime quotes et espaces)."""
    val = os.getenv(key)
    if val is None:
        val = config_data.get(key, default)
    if val is None:
        return default
    return str(val).strip().strip("'").strip('"').strip()


def _as_bool(value, default: bool = False) -> bool:
    """Convertit une valeur en booléen de manière robuste."""
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().strip("'").strip('"').lower() in {"1", "true", "yes", "on"}


class MailConfigurationError(RuntimeError):
    """Erreur de configuration SMTP sans exposer de secret dans les logs."""


def _required_env_val(key: str) -> str:
    value = _clean_env_val(key)
    if not value:
        raise MailConfigurationError(f"Configuration SMTP incomplète: {key} est manquant.")
    return value


def _get_mail_config() -> ConnectionConfig:
    """Crée la configuration mail à la demande (lazy) pour éviter un crash au démarrage."""
    use_ssl = _as_bool(os.getenv("MAIL_SSL_TLS", config_data.get("MAIL_SSL_TLS")))
    default_port = "465" if use_ssl else "587"
    mail_username = _required_env_val("MAIL_USERNAME")
    return ConnectionConfig(
        MAIL_USERNAME=mail_username,
        MAIL_PASSWORD=_required_env_val("MAIL_PASSWORD"),
        MAIL_FROM=_clean_env_val("MAIL_FROM", mail_username),
        MAIL_PORT=int(_clean_env_val("MAIL_PORT", default_port)),
        MAIL_SERVER=_required_env_val("MAIL_SERVER"),
        MAIL_STARTTLS=_as_bool(os.getenv("MAIL_STARTTLS", config_data.get("MAIL_STARTTLS"))),
        MAIL_SSL_TLS=use_ssl,
        USE_CREDENTIALS=_as_bool(os.getenv("USE_CREDENTIALS", config_data.get("USE_CREDENTIALS")), default=True),
        VALIDATE_CERTS=_as_bool(os.getenv("VALIDATE_CERTS", config_data.get("VALIDATE_CERTS")), default=True),
    )


# -----------------------------
# Variables frontend
# -----------------------------

front_base_url = _clean_env_val("FRONT_BASE_URL")
front_register_url = _clean_env_val("FRONT_REGISTER_URL", "/register")
back_base_url = _clean_env_val("BACK_BASE_URL", "http://localhost:8004")


# -----------------------------
# Template HTML commun
# -----------------------------

def get_html_template(title, body_content, button_text=None, button_url=None):
    button_html = ""
    if button_text and button_url:
        button_html = f"""
        <div style="text-align: center; margin: 30px 0;">
            <a href="{button_url}" style="background-color: #264a67; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                {button_text}
            </a>
        </div>
        """
    
    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
            .header {{ background-color: #264a67; color: #ffffff; padding: 30px; text-align: center; }}
            .content {{ padding: 40px; color: #333333; line-height: 1.6; }}
            .footer {{ background-color: #f8f9fa; color: #777777; padding: 20px; text-align: center; font-size: 12px; }}
            h2 {{ color: #264a67; margin-top: 0; }}
            p {{ margin-bottom: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 24px;">K-Planner</h1>
            </div>
            <div class="content">
                <h2>{title}</h2>
                {body_content}
                {button_html}
            </div>
            <div class="footer">
                <p>&copy; 2026 KAPITAL DEV. Tous droits réservés.</p>
                <p>Ceci est un message automatique, veuillez ne pas y répondre.</p>
            </div>
        </div>
    </body>
    </html>
    """


# -----------------------------
# Fonctions d'envoi d'emails
# -----------------------------

async def send_liste_invitation_email(
    inviter_username: str,
    invited_username: str,
    email: str,
    liste_name: str,
    role: str,
    token: str,
    is_guest: bool = False,
):
    logger.debug(f"Entering send_liste_invitation_email for {email}")
    if is_guest:
        invitation_link = f"{front_base_url}{front_register_url}?invitation_token={token}"
    else:
        invitation_link = f"{back_base_url}/listes/invitations/accept-from-email?token={token}"
    
    body = f"""
        <p>Bonjour <strong>{invited_username}</strong>,</p>
        <p><strong>{inviter_username}</strong> vous invite à collaborer sur la liste <strong>{liste_name}</strong> avec le rôle <strong>{role}</strong>.</p>
    """
    template = get_html_template(f"Invitation Liste - {liste_name}", body, "Accepter l'invitation", invitation_link)

    message = MessageSchema(
        subject=f"K-Planer - Invitation dans la liste {liste_name}",
        recipients=[email],
        body=template,
        subtype=MessageType.html,
    )

    fm = FastMail(_get_mail_config())
    await fm.send_message(message)
    logger.debug(f"send_liste_invitation_email SUCCESS to {email}")
    return token
