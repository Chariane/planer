# Se connecter à PostgreSQL
psql -U osons -d K-Planer

# Exécuter ces commandes SQL
ALTER TABLE utilisateur ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE utilisateur ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE utilisateur ADD COLUMN last_login TIMESTAMP NULL;
ALTER TABLE utilisateur ADD COLUMN last_failed_login TIMESTAMP NULL;

# Créer un index pour performance
CREATE INDEX idx_utilisateur_locked_until ON utilisateur(locked_until) WHERE locked_until IS NOT NULL;

# Vérifier
\d utilisateur

# Quitter
\q