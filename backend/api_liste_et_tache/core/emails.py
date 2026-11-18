import os
import logging
import asyncio
import threading
import httpx
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


async def _deliver_email(recipients: list[str], subject: str, html_body: str) -> None:
    relay_url = _clean_env_val("GOOGLE_APPS_SCRIPT_EMAIL_URL")
    relay_secret = _clean_env_val("GOOGLE_APPS_SCRIPT_EMAIL_SECRET")
    if relay_url or relay_secret:
        if not relay_url or not relay_secret:
            raise RuntimeError("Google Apps Script mail relay is only partially configured")
        async with httpx.AsyncClient(follow_redirects=True, timeout=25) as client:
            response = await client.post(relay_url, json={
                "secret": relay_secret,
                "to": recipients[0],
                "subject": subject,
                "html": html_body,
            })
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict) or result.get("ok") is not True:
            reason = result.get("error", "invalid relay response") if isinstance(result, dict) else "invalid relay response"
            raise RuntimeError(f"Google Apps Script mail relay rejected the message: {reason}")
        return

    await FastMail(_get_mail_config()).send_message(MessageSchema(
        subject=subject,
        recipients=recipients,
        body=html_body,
        subtype=MessageType.html,
    ))


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

    await _deliver_email([email], f"K-Planer - Invitation dans la liste {liste_name}", template)
    logger.debug(f"send_liste_invitation_email SUCCESS to {email}")
    return token


def _run_async_in_thread(coro):
    def runner():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(coro)
        finally:
            loop.close()
    thread = threading.Thread(target=runner, daemon=True)
    thread.start()


async def send_notification_email(
    email: str,
    message_text: str,
    type_: str = "info",
    target_type: str | None = None,
    target_id: str | None = None,
):
    """Envoie un email de notification formaté."""
    if not email:
        return
    
    subject_prefixes = {
        "info": "K-Planner - Information",
        "alerte": "K-Planner - Alerte",
        "warning": "K-Planner - Attention",
        "evenement": "K-Planner - Événement",
    }
    prefix = subject_prefixes.get(type_, "K-Planner - Notification")
    
    clean_message = message_text
    if clean_message.startswith("[[") and "]] " in clean_message:
        clean_message = clean_message.split("]] ", 1)[1]
        
    subject = f"{prefix} : {clean_message[:60]}..." if len(clean_message) > 60 else f"{prefix} : {clean_message}"
    
    title_labels = {
        "info": "Nouvelle notification",
        "alerte": "Alerte de sécurité / gestion",
        "warning": "Attention requise",
        "evenement": "Mise à jour d'événement",
    }
    title = title_labels.get(type_, "Notification K-Planner")
    
    body = f"""
        <p>Bonjour,</p>
        <p>{clean_message}</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">Connectez-vous à votre espace K-Planner pour consulter les détails.</p>
    """
    
    button_url = f"{front_base_url}" if front_base_url else None
    button_text = "Accéder à K-Planner" if button_url else None
    
    template = get_html_template(title, body, button_text, button_url)
    
    try:
        await _deliver_email([email], subject, template)
        logger.debug(f"Notification email envoyée avec succès à {email}")
    except Exception as exc:
        logger.warning(f"Impossible d'envoyer l'email de notification à {email}: {exc}")


def send_notification_email_background(
    email: str,
    message_text: str,
    type_: str = "info",
    target_type: str | None = None,
    target_id: str | None = None,
):
    """Déclenche l'envoi de l'email de notification en arrière-plan (non bloquant)."""
    if not email:
        return
    _run_async_in_thread(send_notification_email(
        email=email,
        message_text=message_text,
        type_=type_,
        target_type=target_type,
        target_id=target_id,
    ))

