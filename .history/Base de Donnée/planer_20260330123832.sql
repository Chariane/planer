-- Dépendance pour gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS planer;

-- 1) workspace
CREATE TABLE IF NOT EXISTS planer.workspace (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_utilisateur VARCHAR(12),
    CONSTRAINT workspace_pkey PRIMARY KEY (id),
    CONSTRAINT workspace_id_utilisateur_fkey
        FOREIGN KEY (id_utilisateur)
        REFERENCES public.utilisateur(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_workspace_utilisateur
    ON planer.workspace (id_utilisateur);

-- 2) espace
CREATE TABLE IF NOT EXISTS planer.espace (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_espace_parent VARCHAR(12),
    id_workspace VARCHAR(12),
    CONSTRAINT espace_pkey PRIMARY KEY (id),
    CONSTRAINT espace_id_espace_parent_fkey
        FOREIGN KEY (id_espace_parent)
        REFERENCES planer.espace(id)
        ON DELETE CASCADE,
    CONSTRAINT espace_id_workspace_fkey
        FOREIGN KEY (id_workspace)
        REFERENCES planer.workspace(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_espace_parent
    ON planer.espace (id_espace_parent);

CREATE INDEX IF NOT EXISTS idx_espace_workspace
    ON planer.espace (id_workspace);

-- 3) liste
CREATE TABLE IF NOT EXISTS planer.liste (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_espace VARCHAR(12),
    id_workspace VARCHAR(12),
    CONSTRAINT liste_pkey PRIMARY KEY (id),
    CONSTRAINT liste_id_espace_fkey
        FOREIGN KEY (id_espace)
        REFERENCES planer.espace(id)
        ON DELETE CASCADE,
    CONSTRAINT liste_id_workspace_fkey
        FOREIGN KEY (id_workspace)
        REFERENCES planer.workspace(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_liste_espace
    ON planer.liste (id_espace);

CREATE INDEX IF NOT EXISTS idx_liste_workspace
    ON planer.liste (id_workspace);

-- 4) tache
CREATE TABLE IF NOT EXISTS planer.tache (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    date_debut TIMESTAMP,
    date_fin_prevue TIMESTAMP,
    statut VARCHAR(50) NOT NULL,
    statut_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    priorite VARCHAR(50),
    ordre_affichage SMALLINT,
    id_liste VARCHAR(12),
    CONSTRAINT tache_pkey PRIMARY KEY (id),
    CONSTRAINT tache_id_liste_fkey
        FOREIGN KEY (id_liste)
        REFERENCES planer.liste(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tache_liste
    ON planer.tache (id_liste);

CREATE INDEX IF NOT EXISTS idx_tache_statut
    ON planer.tache (statut);

CREATE INDEX IF NOT EXISTS idx_tache_priorite
    ON planer.tache (priorite);

CREATE INDEX IF NOT EXISTS idx_tache_date_fin_prevue
    ON planer.tache (date_fin_prevue);

-- 5) membre
CREATE TABLE IF NOT EXISTS planer.membre (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(30) NOT NULL,
    statut VARCHAR(30) NOT NULL,
    id_utilisateur VARCHAR(12),
    id_workspace VARCHAR(12),
    id_espace VARCHAR(12),
    id_liste VARCHAR(12),
    id_tache VARCHAR(12),
    CONSTRAINT membre_pkey PRIMARY KEY (id),
    CONSTRAINT membre_id_utilisateur_fkey
        FOREIGN KEY (id_utilisateur)
        REFERENCES public.utilisateur(id)
        ON DELETE CASCADE,
    CONSTRAINT membre_id_workspace_fkey
        FOREIGN KEY (id_workspace)
        REFERENCES planer.workspace(id)
        ON DELETE CASCADE,
    CONSTRAINT membre_id_espace_fkey
        FOREIGN KEY (id_espace)
        REFERENCES planer.espace(id)
        ON DELETE CASCADE,
    CONSTRAINT membre_id_liste_fkey
        FOREIGN KEY (id_liste)
        REFERENCES planer.liste(id)
        ON DELETE CASCADE,
    CONSTRAINT membre_id_tache_fkey
        FOREIGN KEY (id_tache)
        REFERENCES planer.tache(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membre_utilisateur
    ON planer.membre (id_utilisateur);

CREATE INDEX IF NOT EXISTS idx_membre_workspace
    ON planer.membre (id_workspace);

CREATE INDEX IF NOT EXISTS idx_membre_espace
    ON planer.membre (id_espace);

CREATE INDEX IF NOT EXISTS idx_membre_liste
    ON planer.membre (id_liste);

CREATE INDEX IF NOT EXISTS idx_membre_tache
    ON planer.membre (id_tache);

CREATE INDEX IF NOT EXISTS idx_membre_role
    ON planer.membre (role);

CREATE INDEX IF NOT EXISTS idx_membre_statut
    ON planer.membre (statut);

-- 6) fichier
CREATE TABLE IF NOT EXISTS planer.fichier (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    nom VARCHAR(255) NOT NULL,
    url_fichier VARCHAR(255),
    type_fichier VARCHAR(20),
    meta_donnees JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_membre VARCHAR(12),
    CONSTRAINT fichier_pkey PRIMARY KEY (id),
    CONSTRAINT fichier_id_membre_fkey
        FOREIGN KEY (id_membre)
        REFERENCES planer.membre(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fichier_membre
    ON planer.fichier (id_membre);

CREATE INDEX IF NOT EXISTS idx_fichier_type_fichier
    ON planer.fichier (type_fichier);

-- 7) rapport
CREATE TABLE IF NOT EXISTS planer.rapport (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    titre VARCHAR(150) NOT NULL,
    realisations TEXT,
    difficultes_et_solutions TEXT,
    commentaire TEXT,
    fichier_joint VARCHAR(255),
    periode_debut TIMESTAMP,
    periode_fin TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_membre VARCHAR(12),
    CONSTRAINT rapport_pkey PRIMARY KEY (id),
    CONSTRAINT rapport_id_membre_fkey
        FOREIGN KEY (id_membre)
        REFERENCES planer.membre(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rapport_membre
    ON planer.rapport (id_membre);

CREATE INDEX IF NOT EXISTS idx_rapport_periode_debut
    ON planer.rapport (periode_debut);

CREATE INDEX IF NOT EXISTS idx_rapport_periode_fin
    ON planer.rapport (periode_fin);

-- 8) absence_et_conge
CREATE TABLE IF NOT EXISTS planer.absence_et_conge (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    is_absence BOOLEAN NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    statut VARCHAR(50) NOT NULL,
    statut_date TIMESTAMP NOT NULL,
    motif VARCHAR(255),
    is_conge_planifie BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duree_demandee_en_jours INTEGER,
    id_membre VARCHAR(12),
    CONSTRAINT absence_et_conge_pkey PRIMARY KEY (id),
    CONSTRAINT absence_et_conge_id_membre_fkey
        FOREIGN KEY (id_membre)
        REFERENCES planer.membre(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_absence_et_conge_membre
    ON planer.absence_et_conge (id_membre);

CREATE INDEX IF NOT EXISTS idx_absence_et_conge_statut
    ON planer.absence_et_conge (statut);

CREATE INDEX IF NOT EXISTS idx_absence_et_conge_date_debut
    ON planer.absence_et_conge (date_debut);

-- 9) canevas
CREATE TABLE IF NOT EXISTS planer.canevas (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    is_verrouille BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_liste VARCHAR(12) UNIQUE,
    CONSTRAINT canevas_pkey PRIMARY KEY (id),
    CONSTRAINT canevas_id_liste_key UNIQUE (id_liste),
    CONSTRAINT canevas_id_liste_fkey
        FOREIGN KEY (id_liste)
        REFERENCES planer.liste(id)
        ON DELETE CASCADE
);

-- 10) section
CREATE TABLE IF NOT EXISTS planer.section (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    titre VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_canevas VARCHAR(12),
    CONSTRAINT section_pkey PRIMARY KEY (id),
    CONSTRAINT section_id_canevas_fkey
        FOREIGN KEY (id_canevas)
        REFERENCES planer.canevas(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_section_canevas
    ON planer.section (id_canevas);

CREATE INDEX IF NOT EXISTS idx_section_titre
    ON planer.section (titre);

-- 11) checklist
CREATE TABLE IF NOT EXISTS planer.checklist (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
    texte VARCHAR(255) NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_section VARCHAR(12),
    id_tache VARCHAR(12),
    CONSTRAINT checklist_pkey PRIMARY KEY (id),
    CONSTRAINT checklist_id_section_fkey
        FOREIGN KEY (id_section)
        REFERENCES planer.section(id)
        ON DELETE CASCADE,
    CONSTRAINT checklist_id_tache_fkey
        FOREIGN KEY (id_tache)
        REFERENCES planer.tache(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checklist_section
    ON planer.checklist (id_section);

CREATE INDEX IF NOT EXISTS idx_checklist_tache
    ON planer.checklist (id_tache);

CREATE INDEX IF NOT EXISTS idx_checklist_is_checked
    ON planer.checklist (is_checked);
