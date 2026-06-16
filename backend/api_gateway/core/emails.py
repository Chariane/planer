import os
import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv
from ..schemas import EmailSchema
from .database import config_data

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


def _get_mail_config() -> ConnectionConfig:
    """Crée la configuration mail à la demande (lazy) pour éviter un crash au démarrage."""
    return ConnectionConfig(
        MAIL_USERNAME=_clean_env_val("MAIL_USERNAME"),
        MAIL_PASSWORD=_clean_env_val("MAIL_PASSWORD"),
        MAIL_FROM=_clean_env_val("MAIL_FROM"),
        MAIL_PORT=int(_clean_env_val("MAIL_PORT", "587")),
        MAIL_SERVER=_clean_env_val("MAIL_SERVER"),
        MAIL_STARTTLS=_as_bool(config_data.get("MAIL_STARTTLS")),
        MAIL_SSL_TLS=_as_bool(config_data.get("MAIL_SSL_TLS")),
        USE_CREDENTIALS=_as_bool(config_data.get("USE_CREDENTIALS"), default=True),
        VALIDATE_CERTS=_as_bool(config_data.get("VALIDATE_CERTS"), default=True),
    )


# -----------------------------
# Variables frontend
# -----------------------------

front_base_url = _clean_env_val("FRONT_BASE_URL")
front_account_verification_url = _clean_env_val("FRONT_ACCOUNT_VERIFICATION_URL")
front_password_reset_url = _clean_env_val("FRONT_PASSWORD_RESET_URL")


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
# Utilitaire d'extraction des destinataires
# -----------------------------

def _extract_recipients(email) -> list:
    """Extrait une liste de destinataires à partir d'un EmailSchema ou d'une chaîne."""
    if isinstance(email, str):
        return [email]
    recipients = email.email if hasattr(email, 'email') else [email]
    if isinstance(recipients, list) and len(recipients) > 0 and isinstance(recipients[0], list):
        recipients = recipients[0]
    return recipients


# -----------------------------
# Fonctions d'envoi d'emails
# -----------------------------

async def send_verification_email(username: str, email: EmailSchema, code: str):
    logger.debug(f"Entering send_verification_email for {email}")
    recipients = _extract_recipients(email)

    body = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Merci de vous être inscrit sur K-Planner. Pour finaliser votre inscription, veuillez saisir le code de vérification suivant :</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #264a67; background: #f0f4f8; padding: 15px 30px; border-radius: 8px; border: 2px dashed #264a67;">{code}</span>
        </div>
        <p>Ce code est temporaire et expire dans quelques minutes.</p>
    """
    template = get_html_template("Vérification d'inscription", body)

    message = MessageSchema(
        subject="K-Planner - Vérification de compte",
        recipients=recipients,
        body=template,
        subtype=MessageType.html
    )

    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
        logger.debug(f"send_verification_email SUCCESS to {recipients}")
    except Exception as e:
        logger.error(f"send_verification_email ERROR to {recipients}: {e}")
    return code


async def resend_verification_email(username: str, email: EmailSchema, code: str):
    logger.debug(f"Entering resend_verification_email for {email}")
    recipients = _extract_recipients(email)

    body = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Voici votre nouveau code de vérification pour confirmer votre adresse email sur K-Planner :</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #264a67; background: #f0f4f8; padding: 15px 30px; border-radius: 8px; border: 2px dashed #264a67;">{code}</span>
        </div>
    """
    template = get_html_template("Nouveau code de vérification", body)

    message = MessageSchema(
        subject="K-Planner - Nouveau code de vérification",
        recipients=recipients,
        body=template,
        subtype=MessageType.html
    )

    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
        logger.debug(f"resend_verification_email SUCCESS to {recipients}")
    except Exception as e:
        logger.error(f"resend_verification_email ERROR to {recipients}: {e}")
    return code


async def send_reset_password_email(username: str, email: EmailSchema, token: str):
    logger.debug(f"Entering send_reset_password_email for {email}")
    recipients = _extract_recipients(email)

    body = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Pour réinitialiser votre mot de passe, veuillez saisir le code de vérification suivant :</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #d9534f; background: #fff5f5; padding: 15px 30px; border-radius: 8px; border: 2px dashed #d9534f;">{token}</span>
        </div>
        <p>Ou cliquez sur le bouton ci-dessous pour accéder directement à la page de réinitialisation :</p>
    """
    url = f"{front_base_url}{front_password_reset_url}?token={token}"
    template = get_html_template("Réinitialisation de mot de passe", body, "Réinitialiser mon mot de passe", url)

    message = MessageSchema(
        subject="K-Planner - Réinitialisation de mot de passe",
        recipients=recipients,
        body=template,
        subtype=MessageType.html
    )

    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
        logger.debug(f"send_reset_password_email SUCCESS to {recipients}")
    except Exception as e:
        logger.error(f"send_reset_password_email ERROR to {recipients}: {e}")
    return token
