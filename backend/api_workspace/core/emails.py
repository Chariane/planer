import os
import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from .security import config_data
from dotenv import load_dotenv

load_dotenv()

# Set up logging for persistent debugging
logging.basicConfig(
    filename='/home/nadege/Documents/our_project/K-Planner/backend/api_workspace/email_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True
)
logger = logging.getLogger(__name__)

def _clean_env_val(key: str, default: str = "") -> str:
    val = config_data.get(key, default)
    if val is None:
        return default
    return str(val).strip().strip("'").strip('"').strip()

def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().strip("'").strip('"').lower() in {"1", "true", "yes", "on"}

conf = ConnectionConfig(
    MAIL_USERNAME=_clean_env_val("MAIL_USERNAME"),
    MAIL_PASSWORD=_clean_env_val("MAIL_PASSWORD"),
    MAIL_FROM=_clean_env_val("MAIL_FROM"),
    MAIL_PORT=int(_clean_env_val("MAIL_PORT", "587")),
    MAIL_SERVER=_clean_env_val("MAIL_SERVER"),
    MAIL_STARTTLS=_as_bool(config_data.get("MAIL_STARTTLS")),
    MAIL_SSL_TLS=_as_bool(config_data.get("MAIL_SSL_TLS")),
    USE_CREDENTIALS=_as_bool(config_data.get("USE_CREDENTIALS")),
    VALIDATE_CERTS=_as_bool(config_data.get("VALIDATE_CERTS"))
)

front_base_url = _clean_env_val("FRONT_BASE_URL")
front_account_verification_url = _clean_env_val("FRONT_ACCOUNT_VERIFICATION_URL")
front_register_url = _clean_env_val("FRONT_REGISTER_URL", "/register")
back_base_url = _clean_env_val("BACK_BASE_URL", "http://localhost:8003")

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

async def send_verification_email(username: str, email: str, token: str):
    logger.debug(f"DEBUG: send_verification_email to {email}")
    url = f"{front_base_url}{front_account_verification_url}?token={token}"
    body = f"<p>Bonjour <strong>{username}</strong>,</p><p>Merci de vous être inscrit sur K-Planner. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.</p>"
    template = get_html_template("Vérification de compte", body, "Vérifier mon compte", url)
    
    message = MessageSchema(
        subject="K-Planner - Vérification de votre compte",
        recipients=[email],
        body=template,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.debug(f"DEBUG: send_verification_email SUCCESS to {email}")
    except Exception as e:
        logger.error(f"DEBUG: send_verification_email ERROR to {email}: {e}")

async def send_reset_password_email(username: str, email: str, token: str):
    logger.debug(f"DEBUG: send_reset_password_email to {email}")
    body = f"<p>Bonjour <strong>{username}</strong>,</p><p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de sécurité :</p><h3 style='text-align: center; letter-spacing: 5px; color: #264a67; font-size: 24px;'>{token}</h3>"
    template = get_html_template("Réinitialisation de mot de passe", body)
    
    message = MessageSchema(
        subject="K-Planner - Code de réinitialisation",
        recipients=[email],
        body=template,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.debug(f"DEBUG: send_reset_password_email SUCCESS to {email}")
    except Exception as e:
        logger.error(f"DEBUG: send_reset_password_email ERROR to {email}: {e}")

async def send_workspace_invitation_email(
    inviter_username: str,
    invited_username: str,
    email: str,
    workspace_name: str,
    role: str,
    token: str,
    is_guest: bool = False,
):
    logger.debug(f"DEBUG: Entering send_workspace_invitation_email for {email}")
    if is_guest:
        invitation_link = f"{front_base_url}{front_register_url}?invitation_token={token}"
    else:
        invitation_link = f"{back_base_url}/workspaces/invitations/accept-from-email?token={token}"
    
    body = f"""
        <p>Bonjour <strong>{invited_username}</strong>,</p>
        <p><strong>{inviter_username}</strong> vous invite à rejoindre le workspace <strong>{workspace_name}</strong> en tant que <strong>{role}</strong>.</p>
        <p>Cliquez sur le lien ci-dessous pour accepter l'invitation et commencer à collaborer.</p>
    """
    template = get_html_template(f"Invitation Workspace - {workspace_name}", body, "Accepter l'invitation", invitation_link)

    message = MessageSchema(
        subject=f"K-Planer - Invitation dans le workspace {workspace_name}",
        recipients=[email],
        body=template,
        subtype=MessageType.html,
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.debug(f"DEBUG: fm.send_message SUCCESS to {email}")
    except Exception as e:
        logger.error(f"DEBUG: fm.send_message ERROR to {email}: {e}")

    return token
