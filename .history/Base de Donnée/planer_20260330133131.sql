
############################
# Tables du schéma Planer  #
############################

CREATE TABLE planer.workspace (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    CONSTRAINT workspace_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE RESTRICT
);

CREATE TABLE planer.espace (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_espace_parent VARCHAR(12) REFERENCES planer.espace(id) ON DELETE SET NULL,
    id_workspace VARCHAR(12) REFERENCES planer.workspace(id) ON DELETE SET NULL,
    CONSTRAINT espace_id_espace_parent_fkey FOREIGN KEY (id_espace_parent) REFERENCES planer.espace(id) ON DELETE SET NULL,
    CONSTRAINT espace_id_workspace_fkey FOREIGN KEY (id_workspace) REFERENCES planer.workspace(id) ON DELETE SET NULL
);

CREATE TABLE planer.liste (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_espace VARCHAR(12) REFERENCES planer.espace(id) ON DELETE SET NULL,
    id_workspace VARCHAR(12) REFERENCES planer.workspace(id) ON DELETE SET NULL,
    CONSTRAINT liste_id_espace_fkey FOREIGN KEY (id_espace) REFERENCES planer.espace(id) ON DELETE SET NULL,
    CONSTRAINT liste_id_workspace_fkey FOREIGN KEY (id_workspace) REFERENCES planer.workspace(id) ON DELETE SET NULL
);

CREATE TABLE planer.tache (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    date_debut TIMESTAMP,
    date_fin_prevue TIMESTAMP,
    statut VARCHAR(50) NOT NULL,
    statut_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    priorite VARCHAR(50),
    ordre_affichage SMALLINT,
    id_liste VARCHAR(12) REFERENCES planer.liste(id) ON DELETE SET NULL,
    CONSTRAINT tache_id_liste_fkey FOREIGN KEY (id_liste) REFERENCES planer.liste(id) ON DELETE SET NULL
);

CREATE TABLE planer.membre (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(30) NOT NULL,
    statut VARCHAR(30) NOT NULL,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    id_workspace VARCHAR(12) REFERENCES planer.workspace(id) ON DELETE SET NULL,
    id_espace VARCHAR(12) REFERENCES planer.espace(id) ON DELETE SET NULL,
    id_liste VARCHAR(12) REFERENCES planer.liste(id) ON DELETE SET NULL,
    id_tache VARCHAR(12) REFERENCES planer.tache(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_workspace_fkey FOREIGN KEY (id_workspace) REFERENCES planer.workspace(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_espace_fkey FOREIGN KEY (id_espace) REFERENCES planer.espace(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_liste_fkey FOREIGN KEY (id_liste) REFERENCES planer.liste(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_tache_fkey FOREIGN KEY (id_tache) REFERENCES planer.tache(id) ON DELETE SET NULL
);

CREATE TABLE planer.fichier (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    url_fichier VARCHAR(255),
    type_fichier VARCHAR(20),
    meta_donnees JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_membre VARCHAR(12) REFERENCES planer.membre(id) ON DELETE SET NULL,
    CONSTRAINT fichier_id_membre_fkey FOREIGN KEY (id_membre) REFERENCES planer.membre(id) ON DELETE SET NULL
);

CREATE TABLE planer.rapport (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    realisations TEXT,
    difficultes_et_solutions TEXT,
    commentaire TEXT,
    fichier_joint VARCHAR(255),
    periode_debut TIMESTAMP,
    periode_fin TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_membre VARCHAR(12) REFERENCES planer.membre(id) ON DELETE SET NULL,
    CONSTRAINT rapport_id_membre_fkey FOREIGN KEY (id_membre) REFERENCES planer.membre(id) ON DELETE SET NULL
);

CREATE TABLE planer.absence_et_conge (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    is_absence BOOLEAN NOT NULL,
    date_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(50) NOT NULL,
    statut_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motif VARCHAR(255),
    is_conge_planifie BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duree_demandee_en_jours INTEGER,
    id_membre VARCHAR(12) REFERENCES planer.membre(id) ON DELETE SET NULL,
    CONSTRAINT absence_et_conge_id_membre_fkey FOREIGN KEY (id_membre) REFERENCES planer.membre(id) ON DELETE SET NULL
);

CREATE TABLE planer.canevas (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    is_verrouille BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_liste VARCHAR(12) UNIQUE REFERENCES planer.liste(id) ON DELETE SET NULL,
    CONSTRAINT canevas_pkey PRIMARY KEY (id),
    CONSTRAINT canevas_id_liste_key UNIQUE (id_liste),
    CONSTRAINT canevas_id_liste_fkey FOREIGN KEY (id_liste) REFERENCES planer.liste(id) ON DELETE SET NULL
);

CREATE TABLE planer.section (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_canevas VARCHAR(12) REFERENCES planer.canevas(id) ON DELETE SET NULL ,
    CONSTRAINT section_id_canevas_fkey FOREIGN KEY (id_canevas) REFERENCES planer.canevas(id) ON DELETE SET NULL
);

CREATE TABLE planer.checklist (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    texte VARCHAR(255) NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_section VARCHAR(12) REFERENCES planer.section(id) ON DELETE SET NULL,
    id_tache VARCHAR(12) REFERENCES planer.tache(id) ON DELETE SET NULL,
    CONSTRAINT checklist_id_section_fkey FOREIGN KEY (id_section) REFERENCES planer.section(id) ON DELETE SET NULL,
    CONSTRAINT checklist_id_tache_fkey FOREIGN KEY (id_tache) REFERENCES planer.tache(id) ON DELETE SET NULL
);


-- INDEXES du schema planer
CREATE INDEX IF NOT EXISTS idx_workspace_utilisateur ON planer.workspace (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_espace_parent ON planer.espace (id_espace_parent);
CREATE INDEX IF NOT EXISTS idx_espace_workspace ON planer.espace (id_workspace);
CREATE INDEX IF NOT EXISTS idx_liste_espace ON planer.liste (id_espace);
CREATE INDEX IF NOT EXISTS idx_liste_workspace ON planer.liste (id_workspace);
CREATE INDEX IF NOT EXISTS idx_tache_liste ON planer.tache (id_liste);
CREATE INDEX IF NOT EXISTS idx_tache_statut ON planer.tache (statut);
CREATE INDEX IF NOT EXISTS idx_tache_priorite ON planer.tache (priorite);
CREATE INDEX IF NOT EXISTS idx_tache_date_fin_prevue ON planer.tache (date_fin_prevue);
CREATE INDEX IF NOT EXISTS idx_membre_utilisateur ON planer.membre (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_membre_workspace ON planer.membre (id_workspace);
CREATE INDEX IF NOT EXISTS idx_membre_espace ON planer.membre (id_espace);
CREATE INDEX IF NOT EXISTS idx_membre_liste ON planer.membre (id_liste);
CREATE INDEX IF NOT EXISTS idx_membre_tache ON planer.membre (id_tache);
CREATE INDEX IF NOT EXISTS idx_membre_role ON planer.membre (role);
CREATE INDEX IF NOT EXISTS idx_membre_statut ON planer.membre (statut);
CREATE INDEX IF NOT EXISTS idx_fichier_membre ON planer.fichier (id_membre);
CREATE INDEX IF NOT EXISTS idx_fichier_type_fichier ON planer.fichier (type_fichier);
CREATE INDEX IF NOT EXISTS idx_rapport_membre ON planer.rapport (id_membre);
CREATE INDEX IF NOT EXISTS idx_rapport_periode_debut ON planer.rapport (periode_debut);
CREATE INDEX IF NOT EXISTS idx_rapport_periode_fin ON planer.rapport (periode_fin);
CREATE INDEX IF NOT EXISTS idx_absence_et_conge_membre ON planer.absence_et_conge (id_membre);
CREATE INDEX IF NOT EXISTS idx_absence_et_conge_statut ON planer.absence_et_conge (statut);
CREATE INDEX IF NOT EXISTS idx_absence_et_conge_date_debut ON planer.absence_et_conge (date_debut);
CREATE INDEX IF NOT EXISTS idx_section_canevas ON planer.section (id_canevas);
CREATE INDEX IF NOT EXISTS idx_section_titre ON planer.section (titre);
CREATE INDEX IF NOT EXISTS idx_checklist_section ON planer.checklist (id_section);
CREATE INDEX IF NOT EXISTS idx_checklist_tache ON planer.checklist (id_tache);
CREATE INDEX IF NOT EXISTS idx_checklist_is_checked ON planer.checklist (is_checked);

