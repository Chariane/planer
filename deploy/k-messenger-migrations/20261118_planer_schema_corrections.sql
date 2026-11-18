-- Align the shared demo schema with the current Planer SQL corrections.
ALTER TABLE planer.membre
    DROP CONSTRAINT IF EXISTS membre_statut_check;
ALTER TABLE planer.membre
    ADD CONSTRAINT membre_statut_check CHECK (
        statut = ANY (ARRAY['Actif'::text, 'En attente'::text, 'Suspendu'::text, 'Quitté'::text])
    );

DROP INDEX IF EXISTS planer.idx_membre_workspace_unique;
DROP INDEX IF EXISTS planer.idx_membre_espace_unique;
DROP INDEX IF EXISTS planer.idx_membre_liste_unique;
DROP INDEX IF EXISTS planer.idx_membre_tache_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_workspace_unique
    ON planer.membre (id_utilisateur, id_workspace)
    WHERE id_workspace IS NOT NULL AND id_espace IS NULL AND id_liste IS NULL AND id_tache IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_espace_unique
    ON planer.membre (id_utilisateur, id_espace) WHERE id_espace IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_liste_unique
    ON planer.membre (id_utilisateur, id_liste) WHERE id_liste IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_tache_unique
    ON planer.membre (id_utilisateur, id_tache) WHERE id_tache IS NOT NULL;

ALTER TABLE planer.tache ADD COLUMN IF NOT EXISTS id_tache_parent VARCHAR(12);
ALTER TABLE planer.tache DROP CONSTRAINT IF EXISTS tache_id_tache_parent_fkey;
ALTER TABLE planer.tache ADD CONSTRAINT tache_id_tache_parent_fkey
    FOREIGN KEY (id_tache_parent) REFERENCES planer.tache(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tache_parent ON planer.tache (id_tache_parent);
ALTER TABLE planer.section ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE planer.checklist ALTER COLUMN updated_at DROP NOT NULL;
