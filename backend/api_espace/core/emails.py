from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from ..schemas import EmailSchema
from .security import config_data
from dotenv import load_dotenv

load_dotenv()


conf = ConnectionConfig(
    MAIL_USERNAME=config_data.get("MAIL_USERNAME"),
    MAIL_PASSWORD=config_data.get("MAIL_PASSWORD"),
    MAIL_FROM=config_data.get("MAIL_FROM"),
    MAIL_PORT=config_data.get("MAIL_PORT"),
    MAIL_SERVER=config_data.get("MAIL_SERVER"),
    MAIL_STARTTLS=config_data.get("MAIL_STARTTLS"),
    MAIL_SSL_TLS=config_data.get("MAIL_SSL_TLS"),
    USE_CREDENTIALS=config_data.get("USE_CREDENTIALS"),
    VALIDATE_CERTS=config_data.get("VALIDATE_CERTS")
)

front_base_url = config_data.get("FRONT_BASE_URL")
front_account_verification_url = config_data.get("FRONT_ACCOUNT_VERIFICATION_URL")
front_password_reset_url = config_data.get("FRONT_PASSWORD_RESET_URL")
front_espace_invitation_url = config_data.get("FRONT_ESPACE_INVITATION_URL", "/espace-invitations/accept")


async def send_verification_email(username: str, email: EmailSchema, token: str):

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
                        <p>Merci de vous être inscrit à notre service de boutique en ligne K-store. Pour finaliser votre inscription, veuillez cliquer sur le lien de vérification ci-dessous :</p>
                        <p class="text-center"><a href="{front_base_url}{front_account_verification_url}?token={token}" style="background-color: #264a67; opacity: 0.8; text-decoration: none; color: white; padding: 5px;" class="btn text-white p-3">Vérifier</a></p>
                        <p>Merci,<br>Votre Équipe, <strong>KAPITAL DEV</strong></p>
                    </div>

                </div>

            </body>
            </html>

    """


    message = MessageSchema(
        subject="KAPITAL DEV - Vérification de compte.",
        recipients=email, #Liste des destinataires. Ici, un seul.
        body=template,
        subtype=MessageType.html
    )


    the_email = FastMail(conf)
    await the_email.send_message(message=message)

    return token


async def resend_verification_email(username: str, email: EmailSchema, token: str):
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
                        <h2>Nouveau lien de vérification d'email</h2>
                    </div>
                    <div class="card" style="background-color: #ffffff; border-radius: 8px; box-shadow:5px 15px 10px 10px rgba(0,0,0,0.1); padding: 20px;">
                        <p>Bonjour <strong>{username},</strong></p>
                        <p>Merci de vous être inscrit à notre service de boutique en ligne K-store. Voici votre nouveau lien de vérification de votre email :</p>
                        <p class="text-center"><a href="{front_base_url}{front_account_verification_url}?token={token}" style="background-color: #264a67; opacity: 0.8; text-decoration: none; color: white; padding: 5px;" class="btn text-white p-3">Vérifier</a></p>
                        <p>Merci,<br>Votre Équipe, <strong>KAPITAL DEV</strong></p>
                    </div>

                </div>

            </body>
            </html>

    """

    message = MessageSchema(
        subject="KAPITAL DEV - Vérification de compte.",
        recipients=email,  # Liste des destinataires. Ici, un seul.
        body=template,
        subtype=MessageType.html
    )

    the_email = FastMail(conf)
    await the_email.send_message(message=message)

    return token

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
        recipients=email,  # Liste des destinataires. Ici, un seul.
        body=template,
        subtype=MessageType.html
    )

    the_email = FastMail(conf)
    await the_email.send_message(message=message)

    return token


async def send_espace_invitation_email(
    inviter_username: str,
    invited_username: str,
    email: str,
    espace_name: str,
    role: str,
    token: str,
):
    invitation_link = f"{front_base_url}{front_espace_invitation_url}?token={token}"
    template = f"""
        <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invitation Espace</title>
            </head>
            <body style="background-color:#faf4f4;font-family:Arial,sans-serif;">
                <div style="max-width:600px;margin:auto;padding:20px;">
                    <div style="background:#ffffff;border-radius:8px;padding:24px;box-shadow:0 0 10px rgba(0,0,0,0.08);">
                        <h2 style="color:#264a67;">Invitation a rejoindre un espace</h2>
                        <p>Bonjour <strong>{invited_username}</strong>,</p>
                        <p><strong>{inviter_username}</strong> vous invite a rejoindre l'espace <strong>{espace_name}</strong> sur K-Planer.</p>
                        <p>Role propose : <strong>{role}</strong>.</p>
                        <p>Pour accepter l'invitation, cliquez sur le lien ci-dessous :</p>
                        <p style="text-align:center;margin:30px 0;">
                            <a href="{invitation_link}" style="background-color:#264a67;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">
                                Accepter l'invitation
                            </a>
                        </p>
                        <p style="font-size:0.9em;color:#666666;">Si le bouton ne fonctionne pas, vous pouvez copier ce lien : <br>{invitation_link}</p>
                        <hr style="border:none;border-top:1px solid #eeeeee;margin:20px 0;">
                        <p style="font-size:0.8em;color:#999999;">Ceci est un message automatique, merci de ne pas y repondre.</p>
                    </div>
                </div>
            </body>
            </html>
    """

    message = MessageSchema(
        subject=f"K-Planer - Invitation dans l'espace {espace_name}",
        recipients=[email],
        body=template,
        subtype=MessageType.html,
    )

    the_email = FastMail(conf)
    await the_email.send_message(message=message)

    return token
