-- ============================================================
-- 1. CORRECTION DES STATUTS AUTORISÉS (TABLE MEMBRE)
-- ============================================================
-- On supprime l'ancienne contrainte restrictive
ALTER TABLE planer.membre
DROP CONSTRAINT IF EXISTS membre_statut_check;

-- On ajoute la nouvelle contrainte incluant 'En attente'
ALTER TABLE planer.membre
ADD CONSTRAINT membre_statut_check CHECK (
    statut = ANY (
        ARRAY[
            'Actif'::text,
            'En attente'::text,
            'Suspendu'::text,
            'Quitté'::text
        ]
    )
);

-- ============================================================
-- 2. CORRECTION DES INDEX D'UNICITÉ (FLEXIBILITÉ WORKSPACE/ESPACE)
-- ============================================================
-- Suppression des anciens index trop restrictifs
DROP INDEX IF EXISTS planer.idx_membre_workspace_unique;

DROP INDEX IF EXISTS planer.idx_membre_espace_unique;

DROP INDEX IF EXISTS planer.idx_membre_liste_unique;

DROP INDEX IF EXISTS planer.idx_membre_tache_unique;

-- Création des nouveaux index avec conditions 'WHERE' intelligentes

-- Unicité Workspace : Empêche les doublons dans le workspace parent,
-- mais n'interfère PAS avec les adhésions aux Espaces.
CREATE UNIQUE INDEX idx_membre_workspace_unique ON planer.membre (id_utilisateur, id_workspace)
WHERE (
        id_workspace IS NOT NULL
        AND id_espace IS NULL
        AND id_liste IS NULL
        AND id_tache IS NULL
    );

-- Unicité Espace : Un utilisateur ne peut être qu'une fois dans un espace précis
CREATE UNIQUE INDEX idx_membre_espace_unique ON planer.membre (id_utilisateur, id_espace)
WHERE (id_espace IS NOT NULL);

-- Unicité Liste : Pour les membres invités spécifiquement à une liste
CREATE UNIQUE INDEX idx_membre_liste_unique ON planer.membre (id_utilisateur, id_liste)
WHERE (id_liste IS NOT NULL);

-- Unicité Tâche : Pour les membres invités spécifiquement à une tâche
CREATE UNIQUE INDEX idx_membre_tache_unique ON planer.membre (id_utilisateur, id_tache)
WHERE (id_tache IS NOT NULL);

-- ============================================================
-- 3. AJOUT DES SOUS-TÂCHES RÉELLES
-- ============================================================
-- Les checklists restent des points de contrôle.
-- Les sous-tâches sont maintenant des tâches complètes rattachées à une tâche parent.
ALTER TABLE planer.tache
ADD COLUMN IF NOT EXISTS id_tache_parent VARCHAR(12);

ALTER TABLE planer.tache
DROP CONSTRAINT IF EXISTS tache_id_tache_parent_fkey;

ALTER TABLE planer.tache
ADD CONSTRAINT tache_id_tache_parent_fkey
FOREIGN KEY (id_tache_parent)
REFERENCES planer.tache(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tache_parent ON planer.tache (id_tache_parent);
