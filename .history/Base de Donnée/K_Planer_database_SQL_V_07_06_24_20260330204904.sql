-- K-Planer Database V07-06-24

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET search_path TO pg_catalog,public ;
-- ddl-end --

-- object: public.utilisateur | type: TABLE --
-- DROP TABLE IF EXISTS public.utilisateur CASCADE;
CREATE TABLE public.utilisateur (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	email varchar(100) NOT NULL,
	mot_de_passe varchar(255),
	username varchar(150) NOT NULL,
	nom_complet varchar(150) NOT NULL,
	statut varchar(20) NOT NULL DEFAULT 'Actif',
	date_naissance date,
	adresse varchar(255),
	telephone varchar(16),
	photo varchar(255),
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp,
	vu_at timestamp,
	is_entreprise boolean NOT NULL DEFAULT False,
	id_utilisateur_khc varchar(12),
	CONSTRAINT utilisateur_pk PRIMARY KEY (id),
	CONSTRAINT utilisateur_constr_email UNIQUE (email),
	CONSTRAINT utilisateur_email_check CHECK (LENGTH(email) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.username IS 'Nom à afficher pour l''utilisateur. Par défaut, com complet de la personne physique sinon le nom de l''entreprise or entité';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.nom_complet IS 'Nom complet du particulier ou de l''entreprise';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.statut IS 'in ( ''Actif'', ''Suspendu'',  ''Supprimé'')';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.date_naissance IS 'Date de naissance si c''est une personne, sinon date de création de l''entreprise';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.adresse IS 'Adresse de la personne ou de l''entreprise';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.created_at IS 'date d''inscription';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.updated_at IS 'date de modification';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.vu_at IS 'Date et heure de la dernière activité de l''utilisateur';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.is_entreprise IS 'Si l''utilisateur est une entreprise ou un particulier';
-- ddl-end --
COMMENT ON COLUMN public.utilisateur.id_utilisateur_khc IS 'id de l''utilisateur dans kapital user';


-- object: public.tache | type: TABLE --
-- DROP TABLE IF EXISTS public.tache CASCADE;
CREATE TABLE public.tache (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	titre varchar(255) NOT NULL,
	description text,
	date_debut timestamp,
	date_fin_prevue timestamp,
	statut varchar(50) NOT NULL DEFAULT 'En attente',
	statut_date timestamp NOT NULL DEFAULT now(),
	created_at timestamp NOT NULL DEFAULT now(),
	priorite varchar(50) DEFAULT 'Normale',
	ordre_affichage smallint DEFAULT 0,
	id_liste varchar(12),
	CONSTRAINT tache_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON COLUMN public.tache.titre IS 'Titre de la tâche';
-- ddl-end --
COMMENT ON COLUMN public.tache.statut IS '''En cours'', ''En attente'', ''Bloqué'', ''Terminé'', ''Archivé''';
-- ddl-end --
COMMENT ON COLUMN public.tache.statut_date IS 'La date à la quelle on a le "statut" (en attente, terminé, bloqué, en cours, annulé, archivé) actuel';
-- ddl-end --
COMMENT ON COLUMN public.tache.priorite IS 'Très faible, Faible, Normale, Elévée, Très élevée';
-- ddl-end --
COMMENT ON COLUMN public.tache.ordre_affichage IS 'Numéro d''ordre d''affichage de la tâche dans la liste des tâches';


-- object: public.absence_et_conge | type: TABLE --
-- DROP TABLE IF EXISTS public.absence_et_conge CASCADE;
CREATE TABLE public.absence_et_conge (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	is_absence boolean NOT NULL DEFAULT True,
	date_debut timestamp NOT NULL,
	date_fin timestamp,
	statut varchar(50) NOT NULL DEFAULT 'Effectué',
	statut_date timestamp NOT NULL DEFAULT now(),
	motif varchar(255),
	is_conge_planifie boolean NOT NULL DEFAULT False,
	created_at timestamp NOT NULL DEFAULT now(),
	duree_demandee_en_jours integer,
	conge_interrompu_at timestamp,
	id_membre varchar(12),
	CONSTRAINT abasence_et_conge_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON TABLE public.absence_et_conge IS 'Table pour la gestion des congés et absences';
-- ddl-end --
COMMENT ON COLUMN public.absence_et_conge.is_absence IS 'Si c''est une absence ou congé';
-- ddl-end --
COMMENT ON COLUMN public.absence_et_conge.statut IS 'in (''En attente'', ''Accepté'', ''Refusé'', ''Effectué'')';
-- ddl-end --
COMMENT ON COLUMN public.absence_et_conge.statut_date IS 'Date de statut actuel';
-- ddl-end --
COMMENT ON COLUMN public.absence_et_conge.motif IS 'Motif de l''absence ou du congé';
-- ddl-end --
COMMENT ON COLUMN public.absence_et_conge.is_conge_planifie IS 'C''est un congé planifié (en attente) ou pas (ou congé demandé)';

-- object: public.workspace | type: TABLE --
-- DROP TABLE IF EXISTS public.workspace CASCADE;
CREATE TABLE public.workspace (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	nom varchar(100) NOT NULL,
	description text,
	created_at timestamp NOT NULL DEFAULT Now(),
	updated_at timestamp,
	id_utilisateur varchar(12),
	CONSTRAINT workspace_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON TABLE public.workspace IS 'Environnement de travail';
-- ddl-end --
COMMENT ON COLUMN public.workspace.nom IS 'Nom de l''environnement de travail';
-- ddl-end --
COMMENT ON COLUMN public.workspace.description IS 'Description ou détails sur les objectifs de l''environnement de travail';


-- object: public.membre | type: TABLE --
-- DROP TABLE IF EXISTS public.membre CASCADE;
CREATE TABLE public.membre (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	created_at timestamp NOT NULL DEFAULT Now(),
	role varchar(30) NOT NULL DEFAULT 'Membre',
	statut varchar(30) NOT NULL DEFAULT 'Actif',
	id_utilisateur varchar(12),
	id_workspace varchar(12),
	id_espace varchar(12),
	id_liste varchar(12),
	id_tache varchar(12),
	CONSTRAINT membre_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON COLUMN public.membre.created_at IS 'Date d''adhésion au  workspace, espace, liste ou tache';
-- ddl-end --
COMMENT ON COLUMN public.membre.role IS 'Créateur, Administrateur, Membre, Invité';
-- ddl-end --
COMMENT ON COLUMN public.membre.statut IS '''Actif'', ''Suspendu'', ''Quitté''';

-- object: public.rapport | type: TABLE --
-- DROP TABLE IF EXISTS public.rapport CASCADE;
CREATE TABLE public.rapport (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	titre varchar(150) NOT NULL,
	realisations text,
	difficultes_et_solutions text,
	commentaire text,
	fichier_joint varchar(255),
	periode_debut timestamp,
	periode_fin timestamp,
	created_at timestamp NOT NULL DEFAULT now(),
	id_membre varchar(12),
	CONSTRAINT rapport_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON COLUMN public.rapport.realisations IS 'Contenu (texte bien formaté) du rapport concernant les tâches réalisées';
-- ddl-end --
COMMENT ON COLUMN public.rapport.difficultes_et_solutions IS 'Difficultés rencontrées et d''éventuelles solutions';
-- ddl-end --
COMMENT ON COLUMN public.rapport.commentaire IS 'Commentaires, observations ou perspectives';
-- ddl-end --
COMMENT ON COLUMN public.rapport.fichier_joint IS 'Chamin du fichier associé au rapport';


-- object: public.espace | type: TABLE --
-- DROP TABLE IF EXISTS public.espace CASCADE;
CREATE TABLE public.espace (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	nom varchar(150) NOT NULL,
	description text,
	created_at timestamp NOT NULL,
	id_espace_parent varchar(12),
	id_workspace varchar(12),
	CONSTRAINT espace_pk PRIMARY KEY (id)
);


-- object: public.liste | type: TABLE --
-- DROP TABLE IF EXISTS public.liste CASCADE;
CREATE TABLE public.liste (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	nom varchar(150) NOT NULL,
	description text,
	created_at timestamp NOT NULL DEFAULT now(),
	id_espace varchar(12),
	id_workspace varchar(12),
	CONSTRAINT liste_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON TABLE public.liste IS 'Une liste peut être considérée comme un projet ayant plusieurs tâches sur lesquelles plusieurs membres travaillent';


-- object: public.fichier | type: TABLE --
-- DROP TABLE IF EXISTS public.fichier CASCADE;
CREATE TABLE public.fichier (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	nom varchar(255) NOT NULL,
	url_fichier varchar(255),
	type_fichier varchar(20),
	meta_donnees json,
	created_at timestamp NOT NULL DEFAULT now(),
	id_membre varchar(12),
	CONSTRAINT fichier_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON COLUMN public.fichier.type_fichier IS 'Image, PDF, Vidéo, Audio, TXT, ZIP, Binaire';


-- object: public.canevas | type: TABLE --
-- DROP TABLE IF EXISTS public.canevas CASCADE;
CREATE TABLE public.canevas (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	is_verrouille boolean NOT NULL DEFAULT False,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp,
	id_liste varchar(12),
	CONSTRAINT canevas_pk PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON COLUMN public.canevas.is_verrouille IS 'Si le canevas est verrouillé et non modifiable par les membres simples';


-- object: public.section | type: TABLE --
-- DROP TABLE IF EXISTS public.section CASCADE;
CREATE TABLE public.section (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	titre varchar(150) NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp,
	id_canevas varchar(12),
	CONSTRAINT section_pk PRIMARY KEY (id)
);


-- object: public.checklist | type: TABLE --
-- DROP TABLE IF EXISTS public.checklist CASCADE;
CREATE TABLE public.checklist (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
	texte varchar(255) NOT NULL,
	is_checked boolean NOT NULL DEFAULT False,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp,
	id_section varchar(12),
	id_tache varchar(12),
	CONSTRAINT checklist PRIMARY KEY (id)
);
-- ddl-end --
COMMENT ON COLUMN public.checklist.is_checked IS 'Si l''élément est coché ou pas';


-- object: utilisateur_fk | type: CONSTRAINT --
-- ALTER TABLE public.workspace DROP CONSTRAINT IF EXISTS utilisateur_fk CASCADE;
ALTER TABLE public.workspace ADD CONSTRAINT utilisateur_fk FOREIGN KEY (id_utilisateur)
REFERENCES public.utilisateur (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: workspace_fk | type: CONSTRAINT --
-- ALTER TABLE public.espace DROP CONSTRAINT IF EXISTS workspace_fk CASCADE;
ALTER TABLE public.espace ADD CONSTRAINT workspace_fk FOREIGN KEY (id_workspace)
REFERENCES public.workspace (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: espace_fk | type: CONSTRAINT --
-- ALTER TABLE public.liste DROP CONSTRAINT IF EXISTS espace_fk CASCADE;
ALTER TABLE public.liste ADD CONSTRAINT espace_fk FOREIGN KEY (id_espace)
REFERENCES public.espace (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: workspace_fk | type: CONSTRAINT --
-- ALTER TABLE public.liste DROP CONSTRAINT IF EXISTS workspace_fk CASCADE;
ALTER TABLE public.liste ADD CONSTRAINT workspace_fk FOREIGN KEY (id_workspace)
REFERENCES public.workspace (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: liste_fk | type: CONSTRAINT --
-- ALTER TABLE public.tache DROP CONSTRAINT IF EXISTS liste_fk CASCADE;
ALTER TABLE public.tache ADD CONSTRAINT liste_fk FOREIGN KEY (id_liste)
REFERENCES public.liste (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: utilisateur_fk | type: CONSTRAINT --
-- ALTER TABLE public.membre DROP CONSTRAINT IF EXISTS utilisateur_fk CASCADE;
ALTER TABLE public.membre ADD CONSTRAINT utilisateur_fk FOREIGN KEY (id_utilisateur)
REFERENCES public.utilisateur (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: workspace_fk | type: CONSTRAINT --
-- ALTER TABLE public.membre DROP CONSTRAINT IF EXISTS workspace_fk CASCADE;
ALTER TABLE public.membre ADD CONSTRAINT workspace_fk FOREIGN KEY (id_workspace)
REFERENCES public.workspace (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: espace_fk | type: CONSTRAINT --
-- ALTER TABLE public.membre DROP CONSTRAINT IF EXISTS espace_fk CASCADE;
ALTER TABLE public.membre ADD CONSTRAINT espace_fk FOREIGN KEY (id_espace)
REFERENCES public.espace (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: liste_fk | type: CONSTRAINT --
-- ALTER TABLE public.membre DROP CONSTRAINT IF EXISTS liste_fk CASCADE;
ALTER TABLE public.membre ADD CONSTRAINT liste_fk FOREIGN KEY (id_liste)
REFERENCES public.liste (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: tache_fk | type: CONSTRAINT --
-- ALTER TABLE public.membre DROP CONSTRAINT IF EXISTS tache_fk CASCADE;
ALTER TABLE public.membre ADD CONSTRAINT tache_fk FOREIGN KEY (id_tache)
REFERENCES public.tache (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: membre_fk | type: CONSTRAINT --
-- ALTER TABLE public.fichier DROP CONSTRAINT IF EXISTS membre_fk CASCADE;
ALTER TABLE public.fichier ADD CONSTRAINT membre_fk FOREIGN KEY (id_membre)
REFERENCES public.membre (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: membre_fk | type: CONSTRAINT --
-- ALTER TABLE public.rapport DROP CONSTRAINT IF EXISTS membre_fk CASCADE;
ALTER TABLE public.rapport ADD CONSTRAINT membre_fk FOREIGN KEY (id_membre)
REFERENCES public.membre (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: membre_fk | type: CONSTRAINT --
-- ALTER TABLE public.absence_et_conge DROP CONSTRAINT IF EXISTS membre_fk CASCADE;
ALTER TABLE public.absence_et_conge ADD CONSTRAINT membre_fk FOREIGN KEY (id_membre)
REFERENCES public.membre (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: liste_fk | type: CONSTRAINT --
-- ALTER TABLE public.canevas DROP CONSTRAINT IF EXISTS liste_fk CASCADE;
ALTER TABLE public.canevas ADD CONSTRAINT liste_fk FOREIGN KEY (id_liste)
REFERENCES public.liste (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: canevas_uq | type: CONSTRAINT --
-- ALTER TABLE public.canevas DROP CONSTRAINT IF EXISTS canevas_uq CASCADE;
ALTER TABLE public.canevas ADD CONSTRAINT canevas_uq UNIQUE (id_liste);
-- ddl-end --

-- object: canevas_fk | type: CONSTRAINT --
-- ALTER TABLE public.section DROP CONSTRAINT IF EXISTS canevas_fk CASCADE;
ALTER TABLE public.section ADD CONSTRAINT canevas_fk FOREIGN KEY (id_canevas)
REFERENCES public.canevas (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: section_fk | type: CONSTRAINT --
-- ALTER TABLE public.checklist DROP CONSTRAINT IF EXISTS section_fk CASCADE;
ALTER TABLE public.checklist ADD CONSTRAINT section_fk FOREIGN KEY (id_section)
REFERENCES public.section (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: tache_fk | type: CONSTRAINT --
-- ALTER TABLE public.checklist DROP CONSTRAINT IF EXISTS tache_fk CASCADE;
ALTER TABLE public.checklist ADD CONSTRAINT tache_fk FOREIGN KEY (id_tache)
REFERENCES public.tache (id) MATCH FULL
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: espace_parent_fk | type: CONSTRAINT --
-- ALTER TABLE public.espace DROP CONSTRAINT IF EXISTS espace_parent_fk CASCADE;
ALTER TABLE public.espace ADD CONSTRAINT espace_parent_fk FOREIGN KEY (id_espace_parent)
REFERENCES public.espace (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --


