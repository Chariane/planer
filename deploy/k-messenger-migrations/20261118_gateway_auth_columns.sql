-- Columns required by the API Gateway's Utilisateur ORM model.
ALTER TABLE public.utilisateur
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.utilisateur
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;
ALTER TABLE public.utilisateur
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;
ALTER TABLE public.utilisateur
    ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_utilisateur_locked_until
    ON public.utilisateur (locked_until) WHERE locked_until IS NOT NULL;
