-- =====================================================================
-- MIGRATION 001 : Mise à niveau professionnelle du schéma messagerie
-- Auteur : K-Messenger Team
-- Date   : 2026-06-12
-- =====================================================================
-- Exécuter ce fichier UNE SEULE FOIS sur la base de données.
-- psql -d <votre_bdd> -f migrations/001_professional_upgrade.sql

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABLE DES PIÈCES JOINTES (Remplacement du BYTEA dans message)
--    Les fichiers sont stockés sur disque, on ne stocke que l'URL.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messagerie.attachment (
    id           VARCHAR(12)  NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_message   VARCHAR(12)  NOT NULL REFERENCES messagerie.message(id) ON DELETE CASCADE,
    file_url     VARCHAR(512) NOT NULL,          -- ex: "/uploads/2026/06/abc123.mp3"
    file_type    VARCHAR(100),                   -- ex: "audio/mpeg", "image/jpeg"
    file_size    INTEGER,                        -- Taille en octets
    original_name VARCHAR(255),                 -- Nom d'origine du fichier uploadé
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attachment_message ON messagerie.attachment(id_message);

-- ─────────────────────────────────────────────────────────────────────
-- 2. TABLE DES ACCUSÉS DE LECTURE (Delivered / Read per user)
--    Remplace le simple booléen `seen` pour les groupes notamment.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messagerie.message_read_receipt (
    id_message     VARCHAR(12) NOT NULL REFERENCES messagerie.message(id) ON DELETE CASCADE,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    status         VARCHAR(20) CHECK (status IN ('delivered', 'read')) DEFAULT 'delivered',
    status_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_message, id_utilisateur)
);
CREATE INDEX IF NOT EXISTS idx_read_receipt_user ON messagerie.message_read_receipt(id_utilisateur);

-- ─────────────────────────────────────────────────────────────────────
-- 3. TABLE DES RÉACTIONS AUX MESSAGES (Emojis)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messagerie.message_reaction (
    id             VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_message     VARCHAR(12) NOT NULL REFERENCES messagerie.message(id) ON DELETE CASCADE,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    emoji          VARCHAR(20) NOT NULL,   -- ex: "👍", "❤️", "😂"
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_message, id_utilisateur, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reaction_message ON messagerie.message_reaction(id_message);

-- ─────────────────────────────────────────────────────────────────────
-- 4. TABLE DE PRÉSENCE UTILISATEUR (Online / Last Seen)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messagerie.user_presence (
    id_utilisateur  VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE PRIMARY KEY,
    is_online       BOOLEAN DEFAULT FALSE,
    last_seen       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    do_not_disturb  BOOLEAN DEFAULT FALSE,
    custom_status   VARCHAR(255)   -- ex: "En réunion", "Occupé"
);

-- ─────────────────────────────────────────────────────────────────────
-- 5. AMÉLIORATIONS TABLE MESSAGE (Reply / Pin / Edit)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE messagerie.message
    ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR(12) REFERENCES messagerie.message(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_pinned   BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_edited   BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────
-- 6. AMÉLIORATIONS TABLE GROUPE_MEMBERS (Rôles)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE messagerie.groupe_members
    ADD COLUMN IF NOT EXISTS role      VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────────────
-- 7. AMÉLIORATIONS TABLE GROUPE (Description & Photo URL)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE messagerie.groupe
    ADD COLUMN IF NOT EXISTS description VARCHAR(500),
    ADD COLUMN IF NOT EXISTS photo_url   VARCHAR(512),   -- URL vers l'image du groupe
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────────────
-- FIN DE MIGRATION
-- ─────────────────────────────────────────────────────────────────────
