import asyncio
import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import dotenv_values

# Simulate the same loading logic as the app
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Note: In the app it's os.path.dirname(os.path.dirname(__file__)) because it's in core/
config_data = dotenv_values(".env")

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

print(f"Testing SMTP with:")
print(f"  Server: {conf.MAIL_SERVER}")
print(f"  Port: {conf.MAIL_PORT}")
print(f"  User: {conf.MAIL_USERNAME}")
print(f"  SSL/TLS: {conf.MAIL_SSL_TLS}")
print(f"  STARTTLS: {conf.MAIL_STARTTLS}")

async def test_email():
    message = MessageSchema(
        subject="K-Planer Test Email",
        recipients=["afriqfood02@gmail.com"], # Send to self
        body="This is a test email from the diagnostic script.",
        subtype=MessageType.plain
    )
    
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print("✅ Email sent successfully!")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

if __name__ == "__main__":
    asyncio.run(test_email())
