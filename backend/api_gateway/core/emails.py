import os

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv

from ..schemas import EmailSchema
from .database import config_data

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

front_base_url = config_data.get("FRONT_BASE_URL")
front_account_verification_url = config_data.get("FRONT_ACCOUNT_VERIFICATION_URL")
front_password_reset_url = config_data.get("FRONT_PASSWORD_RESET_URL")


def _as_bool(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _get_mail_config() -> ConnectionConfig:
    required_keys = [
        "MAIL_USERNAME",
        "MAIL_PASSWORD",
        "MAIL_FROM",
        "MAIL_PORT",
        "MAIL_SERVER",
    ]

    missing_keys = [key for key in required_keys if not config_data.get(key)]
    if missing_keys:
        missing = ", ".join(missing_keys)
        raise RuntimeError(f"Configuration email incomplète dans backend/api_gateway/.env : {missing}")

    return ConnectionConfig(
        MAIL_USERNAME=config_data.get("MAIL_USERNAME"),
        MAIL_PASSWORD=config_data.get("MAIL_PASSWORD"),
        MAIL_FROM=config_data.get("MAIL_FROM"),
        MAIL_PORT=int(config_data.get("MAIL_PORT")),
        MAIL_SERVER=config_data.get("MAIL_SERVER"),
        MAIL_STARTTLS=_as_bool(config_data.get("MAIL_STARTTLS")),
        MAIL_SSL_TLS=_as_bool(config_data.get("MAIL_SSL_TLS")),
        USE_CREDENTIALS=_as_bool(config_data.get("USE_CREDENTIALS"), default=True),
        VALIDATE_CERTS=_as_bool(config_data.get("VALIDATE_CERTS"), default=True),
    )


async def send_verification_email(username: str, email: EmailSchema, code: str):

    template = f"""
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmation d'Inscription</title>
                <!-- Inclure Bootstrap CSS -->
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
                <style>
                    body {{
                        background-color: #faf4f4;
                    }}
                    .btn:hover {{
                        opacity: 3;
                        animation: heartBeat ;
                        animation-duration: 2s;
                    }}
                </style>
            </head>
            <body>

                <div class="container" style="max-width: 600px; margin: auto; padding: 20px;margin-top:5%;">
                    <div class="text-center mb-5">
                        <h2>Vérification d'Inscription</h2>
                    </div>
                    <div class="card" style="background-color: #ffffff; border-radius: 8px; box-shadow:5px 15px 10px 10px rgba(0,0,0,0.1); padding: 20px;">
                        <p>Bonjour <strong>{username},</strong></p>
                        <p>Merci de vous être inscrit sur K-Planer. Pour finaliser votre inscription, veuillez saisir ce code de vérification :</p>
                        <p style="font-size: 1.8em; text-align: center; font-weight: bold; letter-spacing: 8px; color: #264a67; margin: 20px 0;">{code}</p>
                        <p>Ce code est temporaire. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
                        <p>Merci,<br>Votre Équipe, <strong>KAPITAL DEV</strong></p>
                    </div>

                </div>

            </body>
            </html>

    """


    message = MessageSchema(
        subject="KAPITAL DEV - Vérification de compte.",
        recipients=email.email, #Liste des destinataires. Ici, un seul.
        body=template,
        subtype=MessageType.html
    )


    the_email = FastMail(_get_mail_config())
    await the_email.send_message(message=message)

    return code


async def resend_verification_email(username: str, email: EmailSchema, code: str):
    template = f"""
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmation d'Inscription</title>
                <!-- Inclure Bootstrap CSS -->
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
                <style>
                    body {{
                        background-color: #faf4f4;
                    }}
                    .btn:hover {{
                        opacity: 3;
                        animation: heartBeat ;
                        animation-duration: 2s;
                    }}
                </style>
            </head>
            <body>

                <div class="container" style="max-width: 600px; margin: auto; padding: 20px;margin-top:5%;">
                    <div class="text-center mb-5">
                        <h2>Nouveau code de vérification</h2>
                    </div>
                    <div class="card" style="background-color: #ffffff; border-radius: 8px; box-shadow:5px 15px 10px 10px rgba(0,0,0,0.1); padding: 20px;">
                        <p>Bonjour <strong>{username},</strong></p>
                        <p>Voici votre nouveau code de vérification pour confirmer votre adresse email sur K-Planer :</p>
                        <p style="font-size: 1.8em; text-align: center; font-weight: bold; letter-spacing: 8px; color: #264a67; margin: 20px 0;">{code}</p>
                        <p>Ce code est temporaire. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
                        <p>Merci,<br>Votre Équipe, <strong>KAPITAL DEV</strong></p>
                    </div>

                </div>

            </body>
            </html>

    """

    message = MessageSchema(
        subject="KAPITAL DEV - Vérification de compte.",
        recipients=email.email,  # Liste des destinataires. Ici, un seul.
        body=template,
        subtype=MessageType.html
    )

    the_email = FastMail(_get_mail_config())
    await the_email.send_message(message=message)

    return code

async def send_reset_password_email(username: str, email: EmailSchema, token: str):
    template = f"""
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Réinitialisation de Mot de Passe</title>
                <!-- Inclure Bootstrap CSS -->
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
                <style>
                    body {{
                        background-color: #faf4f4;
                        text-align: justify;
                    }}
                    .btn:hover{{
                        opacity: 3;
                        animation: pulse;
                        animation-duration: 2s;
                    }}
                </style>
            </head>
            <body>

                <div class="container" style="max-width: 600px; margin: auto; padding: 20px;margin-top:10%;">
                    <div class="text-center mb-5">
                        <h2>Réinitialisation de Mot de Passe</h2>
                    </div>
                    <div class="card" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding: 20px;">
                        <p>Bonjour <strong>{username},</strong></p>
                        <p>Pour réinitialiser votre mot de passe, voici votre code de vérification :</p>
                        <p style="font-size: 1.5em; text-align: center; font-weight: bold; letter-spacing: 5px; color: #264a67; margin: 20px 0;">{token}</p>
                        <p>Ou cliquez sur le lien ci-dessous:</p>
                        <p class="text-center"><a href="{front_base_url}{front_password_reset_url}?token={token}" style="background-color: #264a67; opacity: 0.8; text-decoration: none; color: white; padding: 5px;" class="btn text-white p-3">Réinitialiser</a></p>
                        <p>Merci,<br>Votre Équipe <strong>KAPITAL DEV</strong></p>
                    </div>
                </div>

            </body>
            </html>
    """


    message = MessageSchema(
        subject="KAPITAL DEV - Réinitialisation de mot de passe.",
        recipients=email.email,  # Liste des destinataires. Ici, un seul.
        body=template,
        subtype=MessageType.html
    )

    the_email = FastMail(_get_mail_config())
    await the_email.send_message(message=message)

    return token
