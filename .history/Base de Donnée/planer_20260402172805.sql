
-- =========================
-- TABLES DU SCHEMA planer
-- =========================
-- Table utilisateur
CREATE TABLE public.utilisateur (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
    username varchar(150) NOT NULL,
    nom VARCHAR(100),
    prenoms VARCHAR(100),
    email varchar(100) NOT NULL,
    mot_de_passe varchar(255),
	email_verified_at timestamptz,
	statut varchar(20) NOT NULL DEFAULT 'Actif',
    is_active boolean DEFAULT true NOT NULL,
	token_confirmation_email varchar(255),
	date_exp_token_confirmation_email timestamptz,
    genre VARCHAR(10) CHECK (genre IN ('Homme', 'Femme', 'Autre')),
    photo BYTEA,
    date_nais DATE,
    pays VARCHAR(100),
    ville VARCHAR(100),
    telephone VARCHAR(20),
    biographie TEXT,
    otp_code VARCHAR(5),
    is_utilisateur_verifie boolean NOT NULL DEFAULT TRUE,
    is_livreur BOOLEAN DEFAULT FALSE,
    is_user BOOLEAN DEFAULT TRUE,
    is_entreprise BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_super_admin BOOLEAN DEFAULT FALSE,
    type_compte VARCHAR(20) NOT NULL DEFAULT 'Utilisateur',
    premium_expire_at TIMESTAMP,
    badge VARCHAR(50) DEFAULT 'Aucun' CHECK (badge IN ('Aucun', 'Bronze', 'Argent', 'Or', 'Platine', 'Diamant')),
    delivery_address VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    CONSTRAINT utilisateur_pk PRIMARY KEY (id),
	CONSTRAINT utilisateur_constr_email UNIQUE (email),
	CONSTRAINT utilisateur_constr_email_check CHECK (LENGTH(email) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    CONSTRAINT utilisateur_constr_statut CHECK (statut in ( 'Actif', 'Suspendu',  'Supprimé')),
    CONSTRAINT utilisateur_type_compte_check CHECK (type_compte IN ('Utilisateur', 'Premium')),
    CONSTRAINT utilisateur_premium_expire_check CHECK (type_compte <> 'Premium' OR premium_expire_at IS NOT NULL)
);


CREATE TABLE planer.entreprise (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
	nom varchar(100) NOT NULL,
	description text,
	telephone varchar(20),
	statut_juridique varchar(50),
	adresse varchar(255),
	numero_ifu varchar(13),
	numero_rccm varchar(50),
	date_creation_entreprise date,
	nom_responsable_entreprise varchar(50),
	prenoms_responsable_entreprise varchar(255),
	telephone_responsable_entreprise varchar(20),
	logo varchar(255),
	id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
	is_premium BOOLEAN NOT NULL DEFAULT FALSE,
	premium_activated_at TIMESTAMP,
	premium_expire_at TIMESTAMP,
	statut_compte VARCHAR(20) NOT NULL DEFAULT 'Actif' CHECK (statut_compte IN ('Actif', 'Suspendu', 'Supprime')),
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp,
	site_web varchar(255),
	CONSTRAINT entreprise_constr_numero_ifu UNIQUE (numero_ifu),
	CONSTRAINT entreprise_constr_numero_rccm UNIQUE (numero_rccm),
	CONSTRAINT planer_entreprise_utilisateur_uq UNIQUE (id_utilisateur)
);

CREATE TABLE planer.plan_abonnement (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    montant NUMERIC(12,2) NOT NULL CHECK (montant >= 0),
    devise CHAR(3) NOT NULL DEFAULT 'XOF',
    duree_jours INTEGER NOT NULL CHECK (duree_jours > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE planer.abonnement_entreprise (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_entreprise VARCHAR(12) NOT NULL REFERENCES planer.entreprise(id) ON DELETE CASCADE,
    id_plan_abonnement VARCHAR(12) NOT NULL REFERENCES planer.plan_abonnement(id) ON DELETE RESTRICT,
    date_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 day'),
    statut VARCHAR(20) NOT NULL DEFAULT 'En attente' CHECK (statut IN ('En attente', 'Actif', 'Expire', 'Annule')),
    auto_renouvellement BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT abonnement_entreprise_date_check CHECK (date_fin > date_debut)
);

CREATE TABLE planer.paiement_abonnement (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_abonnement VARCHAR(12) NOT NULL REFERENCES planer.abonnement_entreprise(id) ON DELETE CASCADE,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    montant NUMERIC(12,2) NOT NULL CHECK (montant >= 0),
    devise CHAR(3) NOT NULL DEFAULT 'XOF',
    mode_paiement VARCHAR(30),
    reference_transaction VARCHAR(100) UNIQUE,
    statut VARCHAR(20) NOT NULL DEFAULT 'En attente' CHECK (statut IN ('En attente', 'Reussi', 'Echoue', 'Rembourse')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    statut VARCHAR(50) NOT NULL DEFAULT 'En Attente',
    statut_date TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    priorite VARCHAR(50) DEFAULT 'Normale',
    ordre_affichage SMALLINT DEFAULT 0,
    id_liste VARCHAR(12) REFERENCES planer.liste(id) ON DELETE SET NULL,
    CONSTRAINT tache_id_liste_fkey FOREIGN KEY (id_liste) REFERENCES planer.liste(id) ON DELETE SET NULL
);

CREATE TABLE planer.membre (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(30) NOT NULL DEFAULT 'Membre',
    statut VARCHAR(30) NOT NULL DEFAULT 'Actif',
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    id_workspace VARCHAR(12) REFERENCES planer.workspace(id) ON DELETE SET NULL,
    id_espace VARCHAR(12) REFERENCES planer.espace(id) ON DELETE SET NULL,
    id_liste VARCHAR(12) REFERENCES planer.liste(id) ON DELETE SET NULL,
    id_tache VARCHAR(12) REFERENCES planer.tache(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_workspace_fkey FOREIGN KEY (id_workspace) REFERENCES planer.workspace(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_espace_fkey FOREIGN KEY (id_espace) REFERENCES planer.espace(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_liste_fkey FOREIGN KEY (id_liste) REFERENCES planer.liste(id) ON DELETE SET NULL,
    CONSTRAINT membre_id_tache_fkey FOREIGN KEY (id_tache) REFERENCES planer.tache(id) ON DELETE SET NULL,
    CONSTRAINT membre_role_check CHECK (role IN ('Créateur', 'Administrateur', 'Membre', 'Invité')),
    CONSTRAINT membre_statut_check CHECK (statut IN ('Actif', 'Suspendu', 'Quitté')),
    CONSTRAINT membre_cible_unique_check CHECK (num_nonnulls(id_workspace, id_espace, id_liste, id_tache) = 1)
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
    is_absence BOOLEAN NOT NULL DEFAULT true,
    date_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP,
    statut VARCHAR(50) NOT NULL DEFAULT 'Effectué',
    statut_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motif VARCHAR(255),
    is_conge_planifie BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duree_demandee_en_jours INTEGER,
    conge_interrompu_at timestamp,
    id_membre VARCHAR(12) REFERENCES planer.membre(id) ON DELETE SET NULL,
    CONSTRAINT absence_et_conge_id_membre_fkey FOREIGN KEY (id_membre) REFERENCES planer.membre(id) ON DELETE SET NULL,
    CONSTRAINT absence_et_conge_statut_check CHECK (statut IN ('En attente', 'Accepté', 'Refusé', 'Effectué')),
    CONSTRAINT absence_et_conge_date_fin_check CHECK (date_fin IS NULL OR date_fin >= date_debut),
    CONSTRAINT absence_et_conge_duree_check CHECK (duree_demandee_en_jours IS NULL OR duree_demandee_en_jours >= 0)
);

CREATE TABLE planer.canevas (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    is_verrouille BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_liste VARCHAR(12) UNIQUE REFERENCES planer.liste(id) ON DELETE SET NULL
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

-- Synchronise le statut premium entreprise/utilisateur à partir des abonnements actifs
CREATE OR REPLACE FUNCTION planer.fn_sync_premium_for_entreprise(p_entreprise_id varchar(12))
RETURNS void AS
$$
DECLARE
    v_utilisateur_id varchar(12);
    v_date_fin TIMESTAMP;
BEGIN
    SELECT e.id_utilisateur
    INTO v_utilisateur_id
    FROM planer.entreprise e
    WHERE e.id = p_entreprise_id;

    IF v_utilisateur_id IS NULL THEN
        RETURN;
    END IF;

    SELECT a.date_fin
    INTO v_date_fin
    FROM planer.abonnement_entreprise a
    WHERE a.id_entreprise = p_entreprise_id
      AND a.statut = 'Actif'
      AND a.date_fin >= now()
    ORDER BY a.date_fin DESC
    LIMIT 1;

    IF v_date_fin IS NOT NULL THEN
        UPDATE public.utilisateur
        SET type_compte = 'Premium',
            premium_expire_at = v_date_fin,
            is_entreprise = TRUE,
            date_modif = CURRENT_TIMESTAMP
        WHERE id = v_utilisateur_id;

        UPDATE planer.entreprise
        SET is_premium = TRUE,
            premium_activated_at = COALESCE(premium_activated_at, CURRENT_TIMESTAMP),
            premium_expire_at = v_date_fin,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_entreprise_id;
    ELSE
        UPDATE public.utilisateur
        SET type_compte = 'Utilisateur',
            premium_expire_at = NULL,
            date_modif = CURRENT_TIMESTAMP
        WHERE id = v_utilisateur_id;

        UPDATE planer.entreprise
        SET is_premium = FALSE,
            premium_activated_at = NULL,
            premium_expire_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_entreprise_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION planer.fn_trg_sync_premium_abonnement()
RETURNS trigger AS
$$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM planer.fn_sync_premium_for_entreprise(OLD.id_entreprise);
        RETURN OLD;
    END IF;

    PERFORM planer.fn_sync_premium_for_entreprise(NEW.id_entreprise);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION planer.fn_trg_paiement_abonnement()
RETURNS trigger AS
$$
DECLARE
    v_entreprise_id varchar(12);
    v_date_reference TIMESTAMP;
BEGIN
    IF NEW.statut = 'Reussi'
       AND (
            TG_OP = 'INSERT'
            OR (TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut)
       ) THEN
        v_date_reference := COALESCE(NEW.paid_at, CURRENT_TIMESTAMP);

        UPDATE planer.paiement_abonnement
        SET paid_at = v_date_reference
        WHERE id = NEW.id
          AND paid_at IS NULL;

        UPDATE planer.abonnement_entreprise a
        SET statut = 'Actif',
            date_debut = v_date_reference,
            date_fin = v_date_reference + make_interval(days => p.duree_jours),
            updated_at = CURRENT_TIMESTAMP
        FROM planer.plan_abonnement p
        WHERE a.id = NEW.id_abonnement
          AND p.id = a.id_plan_abonnement;

        SELECT a.id_entreprise
        INTO v_entreprise_id
        FROM planer.abonnement_entreprise a
        WHERE a.id = NEW.id_abonnement;

        IF v_entreprise_id IS NOT NULL THEN
            PERFORM planer.fn_sync_premium_for_entreprise(v_entreprise_id);
        END IF;
    ELSIF NEW.statut IN ('Echoue', 'Rembourse')
       AND (
            TG_OP = 'INSERT'
            OR (TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut)
       ) THEN
        UPDATE planer.abonnement_entreprise
        SET statut = 'Annule',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id_abonnement
          AND statut <> 'Expire';

        SELECT a.id_entreprise
        INTO v_entreprise_id
        FROM planer.abonnement_entreprise a
        WHERE a.id = NEW.id_abonnement;

        IF v_entreprise_id IS NOT NULL THEN
            PERFORM planer.fn_sync_premium_for_entreprise(v_entreprise_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- A exécuter périodiquement (cron/worker) pour expirer les abonnements
CREATE OR REPLACE FUNCTION planer.fn_expirer_abonnements()
RETURNS integer AS
$$
DECLARE
    v_row record;
    v_count integer := 0;
BEGIN
    FOR v_row IN
        SELECT a.id, a.id_entreprise
        FROM planer.abonnement_entreprise a
        WHERE a.statut = 'Actif'
          AND a.date_fin < CURRENT_TIMESTAMP
    LOOP
        UPDATE planer.abonnement_entreprise
        SET statut = 'Expire',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_row.id;

        PERFORM planer.fn_sync_premium_for_entreprise(v_row.id_entreprise);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_premium_on_abonnement
AFTER INSERT OR UPDATE OR DELETE
ON planer.abonnement_entreprise
FOR EACH ROW
EXECUTE FUNCTION planer.fn_trg_sync_premium_abonnement();

CREATE TRIGGER trg_paiement_abonnement_sync
AFTER INSERT OR UPDATE OF statut
ON planer.paiement_abonnement
FOR EACH ROW
EXECUTE FUNCTION planer.fn_trg_paiement_abonnement();


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
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_workspace_unique ON planer.membre (id_utilisateur, id_workspace) WHERE id_workspace IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_espace_unique ON planer.membre (id_utilisateur, id_espace) WHERE id_espace IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_liste_unique ON planer.membre (id_utilisateur, id_liste) WHERE id_liste IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membre_tache_unique ON planer.membre (id_utilisateur, id_tache) WHERE id_tache IS NOT NULL;
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
CREATE INDEX IF NOT EXISTS idx_abonnement_entreprise_id ON planer.abonnement_entreprise (id_entreprise);
CREATE INDEX IF NOT EXISTS idx_abonnement_plan_id ON planer.abonnement_entreprise (id_plan_abonnement);
CREATE INDEX IF NOT EXISTS idx_abonnement_statut_date_fin ON planer.abonnement_entreprise (statut, date_fin);
CREATE INDEX IF NOT EXISTS idx_paiement_abonnement_id ON planer.paiement_abonnement (id_abonnement);
CREATE INDEX IF NOT EXISTS idx_paiement_abonnement_statut ON planer.paiement_abonnement (statut);
CREATE UNIQUE INDEX IF NOT EXISTS idx_abonnement_entreprise_actif_unique ON planer.abonnement_entreprise (id_entreprise) WHERE statut IN ('En attente', 'Actif');

