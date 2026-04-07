ALTER TABLE public.utilisateur
ADD COLUMN IF NOT EXISTS code_verification_email VARCHAR(6),
ADD COLUMN IF NOT EXISTS date_exp_code_verification_email TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_auth_secret VARCHAR(64),
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_auth_configured_at TIMESTAMPTZ;
