# Free email relay for the Render demo

Render's free web services cannot connect to external SMTP ports. This Apps
Script relay uses HTTPS from Render and sends through the owner's Gmail account.
Google currently allows consumer accounts up to 100 email recipients per day.

## Create the relay

1. In the Google account that should send the verification emails, open
   [script.google.com](https://script.google.com) and create a standalone project.
2. Replace the editor's contents with `Code.gs` from this folder.
3. In **Project Settings > Script properties**, add `EMAIL_API_SECRET` with a
   long random secret. Use the same value for `GOOGLE_APPS_SCRIPT_EMAIL_SECRET`
   in Render. Do not commit or send the secret in chat.
4. Save, then choose **Deploy > New deployment > Web app**.
5. Set **Execute as** to your account and **Who has access** to **Anyone**.
   The shared secret in each request protects the public endpoint.
6. Authorize the requested mail permission and deploy. Copy the URL ending in
   `/exec`.
7. In Render, open `k-planer-api-gateway > Environment` and set:
   - `GOOGLE_APPS_SCRIPT_EMAIL_URL` = the deployed `/exec` URL
   - `GOOGLE_APPS_SCRIPT_EMAIL_SECRET` = the exact same secret
8. Save and redeploy `k-planer-api-gateway`.

The gateway will use this HTTPS relay when both variables are set. The code
reports email success only when the relay confirms it accepted the message.
After setup, use **renvoyer le code** for an account that already exists.
