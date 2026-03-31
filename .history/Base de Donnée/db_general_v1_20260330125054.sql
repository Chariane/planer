-- Active: 1763225799904@@localhost@5432@osons_store_v2
-- Activer l'extension pgcrypto pour générer des UUID aléatoires
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Schémas de l'application
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS boutique;
CREATE SCHEMA IF NOT EXISTS messagerie;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS restaurant;
CREATE SCHEMA IF NOT EXISTS planer;

SET search_path TO pg_catalog,public;

-- ========================
-- TABLES DU SCHÉMA public
-- ========================

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
    badge VARCHAR(50) DEFAULT 'Aucun' CHECK (badge IN ('Aucun', 'Bronze', 'Argent', 'Or', 'Platine', 'Diamant')),
    delivery_address VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    CONSTRAINT utilisateur_pk PRIMARY KEY (id),
	CONSTRAINT utilisateur_constr_email UNIQUE (email),
	CONSTRAINT utilisateur_constr_email_check CHECK (LENGTH(email) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    CONSTRAINT utilisateur_constr_statut CHECK (statut in ( 'Actif', 'Suspendu',  'Supprimé'))
);

-- Table motivation
CREATE TABLE public.motivation (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(255) ,
    description TEXT NOT NULL,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catégories
CREATE TABLE public.categorie_publication (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(255),
    description TEXT,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.categorie_evenements (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    titre VARCHAR(255),
    description TEXT,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table publication
CREATE TABLE public.publication (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    titre VARCHAR(255),
    description TEXT,
    photo BYTEA,
    lien_pub TEXT,
    is_valide BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    id_categorie_publication VARCHAR(12) REFERENCES public.categorie_publication(id)
);

-- Table evenement
CREATE TABLE public.evenement (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    titre VARCHAR(255),
    description TEXT,
    lien TEXT,
    type VARCHAR(20) CHECK (type IN ('presentiel', 'online')),
    photo BYTEA,
    date DATE,
    is_valide BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    lien_pub TEXT,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    id_categorie_evenements VARCHAR(12) REFERENCES public.categorie_evenements(id)
);

-- Table participation_evenement
CREATE TABLE public.participation_evenement (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    id_evenement VARCHAR(12) REFERENCES public.evenement(id) ON DELETE RESTRICT,
    statut VARCHAR(20) CHECK (statut IN ('intéressé', 'participe')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table a_propos
CREATE TABLE public.a_propos (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    titre VARCHAR(255),
    qui_sommes_nous TEXT,
    objectifs TEXT,
    vision TEXT,
    photo BYTEA,
    signature VARCHAR(100),
    is_active BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);

-- Table charte
CREATE TABLE public.charte (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    titre VARCHAR(255),
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    poste VARCHAR(100),
    signature TEXT,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);

-- ===========================
-- TABLES DU SCHÉMA boutique
-- ===========================
CREATE TABLE boutique.entreprise (
	id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
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
	id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
	updated_at timestamp,
	site_web varchar(255),
	CONSTRAINT entreprise_pk PRIMARY KEY (id),
	CONSTRAINT entreprise_constr_numero_ifu UNIQUE (numero_ifu)
);

-- Créer la table des catégories
CREATE TABLE boutique.categories (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP
);

-- Créer la table des produits
CREATE TABLE boutique.products (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    id_entreprise VARCHAR(12) REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    id_categorie VARCHAR(12) REFERENCES boutique.categories(id) ON DELETE SET NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--Table TVA
CREATE TABLE boutique.tva_settings (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    tva_rate NUMERIC(10, 2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

--Table Commandes
CREATE TABLE boutique.orders (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    assigned_livreur_id VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    tva_amount numeric(10,2),
    shipping_cost numeric(10,2),
    status character varying(50) NOT NULL,
    total numeric(10,2),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    updated_by VARCHAR(255),
    delivery_address VARCHAR(255)
);

-- Créer la table des entreprises associées à une commande
CREATE TABLE boutique.orders_entreprise (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12) NOT NULL REFERENCES boutique.orders(id) ON DELETE SET NULL,
    id_entreprise VARCHAR(12) NOT NULL REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    subtotal_products NUMERIC(10,2) NOT NULL CHECK (subtotal_products >= 0),
    status character varying(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, id_entreprise)

);


-- Table historique des commandes
CREATE TABLE boutique.order_history (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12) NOT NULL REFERENCES boutique.orders(id) ON DELETE SET NULL,
    ancien_statut TEXT NOT NULL,
    nouveau_statut TEXT NOT NULL,
    modifie_par VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boutique.order_items (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12) NOT NULL REFERENCES boutique.orders(id) ON DELETE SET NULL,
    id_entreprise VARCHAR(12) NOT NULL REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Wallet entreprise (1 ligne par entreprise)
CREATE TABLE boutique.entreprise_wallet (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_entreprise VARCHAR(12) UNIQUE REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,   
    available_balance NUMERIC(12,2) NOT NULL DEFAULT 0, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Demandes de retrait
CREATE TABLE boutique.entreprise_withdrawals (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_entreprise VARCHAR(12) NOT NULL REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    requested_gross_amount NUMERIC(12,2) NOT NULL CHECK (requested_gross_amount > 0),
    fee_rate_snapshot NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    fee_amount NUMERIC(12,2) NOT NULL,
    net_paid_amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(30) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Journal comptable immuable
CREATE TABLE boutique.entreprise_wallet_ledger (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_entreprise VARCHAR(12) NOT NULL REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    id_order_entreprise VARCHAR(12) REFERENCES boutique.orders_entreprise(id) ON DELETE SET NULL,
    id_withdrawal VARCHAR(12) REFERENCES boutique.entreprise_withdrawals(id) ON DELETE SET NULL,
    movement_type VARCHAR(40) NOT NULL, 
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Créer la table des avis des clients sur les produits des entreprises 
CREATE TABLE boutique.reviews (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    id_entreprise VARCHAR(12) REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL
);

-- Créer la table des favoris
CREATE TABLE boutique.favorites (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    id_entreprise VARCHAR(12) REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_utilisateur, id_product)
);
-- Créer la table du panier
CREATE TABLE boutique.cart_items (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_entreprise VARCHAR(12) NOT NULL REFERENCES boutique.entreprise(id) ON DELETE SET NULL,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    id_product VARCHAR(12) NOT NULL REFERENCES boutique.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL
);
-- Table donation
CREATE TABLE boutique.donation (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    montant NUMERIC(10, 2),
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table payments
CREATE TABLE boutique.payments (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12) NOT NULL REFERENCES boutique.orders(id) ON DELETE SET NULL,
    status character varying NOT NULL,
    transaction_id character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    customer_phone VARCHAR(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);

-- Table facture
CREATE TABLE boutique.facture (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    order_id VARCHAR(12) REFERENCES boutique.orders(id) ON DELETE SET NULL,
    id_donation VARCHAR(12) REFERENCES boutique.donation(id) ON DELETE SET NULL,
    description TEXT,
    status character varying NOT NULL,
    total NUMERIC(10, 2),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--Table mot de passe oublié
CREATE TABLE boutique.password_reset_tokens (
    id VARCHAR(12) DEFAULT encode(gen_random_bytes(6), 'hex') NOT NULL,
    token  VARCHAR(255) NOT NULL,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    expires_at timestamp without time zone NOT NULL
);

-- Table photo
CREATE TABLE boutique.photo (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    image BYTEA,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP
);

--Table prix de livraison
CREATE TABLE boutique.prixlivraison (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    Ville VARCHAR(100) NOT NULL,
    prix NUMERIC(10, 2) NOT NULL
);

-- table Footer
CREATE TABLE boutique.footer_settings (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    address VARCHAR(255),
    phone_number VARCHAR(255),
    email VARCHAR(255),
    title VARCHAR(255),
    history_title VARCHAR(255),
    history_content TEXT,
    boutique_today_title VARCHAR(255),
    boutique_today_content TEXT,
    achievements_title VARCHAR(255),
    achievements_content TEXT,
    copyright VARCHAR(255)
);

-- =============================
-- TABLES DU SCHÉMA messagerie
-- =============================

CREATE TABLE messagerie.room (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    member1 VARCHAR(255) NOT NULL,
    member2 VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messagerie.groupe(
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE messagerie.message (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    message TEXT,
    audio BYTEA,
    file BYTEA,
    image BYTEA,
    video BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    seen BOOLEAN DEFAULT FALSE,
    id_room VARCHAR(12) NOT NULL REFERENCES messagerie.room(id) ON DELETE RESTRICT,
    id_groupe VARCHAR(12) REFERENCES messagerie.groupe(id) ON DELETE SET NULL

);
CREATE TABLE messagerie.groupe_members (
    id_groupe VARCHAR(12) REFERENCES messagerie.groupe(id) ON DELETE CASCADE,
    member VARCHAR(255) NOT NULL,
    PRIMARY KEY (id_groupe, member)
);

-- Table notification de message
CREATE TABLE messagerie.notification (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    id_groupe VARCHAR(12) REFERENCES messagerie.groupe(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_lu BOOLEAN DEFAULT FALSE
);

-- =============================
-- SUITE TABLES DU Schémas public
-- =============================
-- Table commentaire
CREATE TABLE public.commentaire (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    description TEXT NOT NULL,
    is_valide BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
	id_publication VARCHAR(12) REFERENCES public.publication(id) ON DELETE RESTRICT,
	id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
	id_evenement VARCHAR(12) REFERENCES public.evenement(id) ON DELETE SET NULL
);
-- Table reponsecommentaire
CREATE TABLE public.reponsecommentaire (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    description TEXT NOT NULL,
    is_valide BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_sup TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
	id_commentaire VARCHAR(12) REFERENCES public.commentaire(id) ON DELETE RESTRICT
);
-- Table reaction
CREATE TABLE public.reaction (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex')PRIMARY KEY,
    type VARCHAR(20) CHECK (type IN ('like', 'adore', 'smile', 'heart')),
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    id_publication VARCHAR(12) REFERENCES public.publication(id) ON DELETE SET NULL,
    id_commentaire VARCHAR(12) REFERENCES public.commentaire(id) ON DELETE SET NULL,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
    id_evenement VARCHAR(12) REFERENCES public.evenement(id) ON DELETE SET NULL,
    id_reponsecommentaire VARCHAR(12) REFERENCES public.reponsecommentaire(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table favori
CREATE TABLE public.favori (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    id_publication VARCHAR(12) REFERENCES public.publication(id) ON DELETE SET NULL,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
    id_evenement VARCHAR(12) REFERENCES public.evenement(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT favori_unique CHECK (
        (id_publication IS NOT NULL)::int +
        (id_product IS NOT NULL)::int +
        (id_evenement IS NOT NULL)::int = 1
    )
);

-- Table mention
-- Cette table permet de gérer les mentions dans les commentaires, réponses, publications et messages
-- Elle peut être étendue pour d'autres types d'objets si nécessaire
CREATE TABLE public.mention (
    id VARCHAR(12) PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),

    id_utilisateur_mentionne VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,

    -- Type d'objet où la mention a eu lieu
    id_commentaire VARCHAR(12) REFERENCES public.commentaire(id) ON DELETE CASCADE,
    id_reponse_commentaire VARCHAR(12) REFERENCES public.reponsecommentaire(id) ON DELETE CASCADE,
    id_publication VARCHAR(12) REFERENCES public.publication(id) ON DELETE CASCADE,
    id_message VARCHAR(12) REFERENCES messagerie.message(id) ON DELETE CASCADE,
    id_groupe VARCHAR(12) REFERENCES messagerie.groupe(id) ON DELETE CASCADE,
    id_evenement VARCHAR(12) REFERENCES public.evenement(id) ON DELETE CASCADE,

    mention_speciale VARCHAR(20) CHECK (mention_speciale IN ('toutlemonde', 'followers', 'admin', 'superadmin', 'alaune', 'membre', 'autre')),

    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table suivi_utilisateur
-- Cette table permet de gérer le suivi entre utilisateurs
-- Un utilisateur peut suivre un autre utilisateur, et on évite les doublons de suivi
CREATE TABLE public.suivi_utilisateur (
    id VARCHAR(12) PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
    id_suiveur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    id_suivi VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    date_suivi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_suivi UNIQUE (id_suiveur, id_suivi),
    CHECK (id_suiveur <> id_suivi) -- éviter qu’un utilisateur se suive lui-même
);

CREATE TABLE public.story (
    id VARCHAR(12) PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
    utilisateur_id VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    type_contenu VARCHAR(20) NOT NULL CHECK (
        type_contenu IN ('texte', 'image', 'video', 'audio', 'texte_audio', 'musique')
    ),
    contenu_texte TEXT,
    medias BYTEA, -- fichier binaire
    type_medias VARCHAR(50) CHECK (
        type_medias IN ('image', 'video', 'audio', 'texte_audio', 'musique')
    ),
    visibilite VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (
        visibilite IN ('public', 'prive', 'followers', 'groupe', 'autre')
    ),
    duree INTEGER DEFAULT 15,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP,
    est_visible BOOLEAN DEFAULT TRUE
);

-- Table mot_de_passe_oublie
CREATE TABLE public.motdepasseoublie (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    token_reinitialisation_mdp VARCHAR(255),
    date_exp_token_reinitialisation TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT
);




-- Table historique_connexion
CREATE TABLE public.historique_connexion (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    date_connexion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    adresse_ip VARCHAR(45), -- pour IPv6
    navigateur VARCHAR(255),
    systeme_exploitation VARCHAR(255),
    localisation VARCHAR(255),
    appareil VARCHAR(255),
    est_reussi BOOLEAN DEFAULT TRUE,
    date_deconnexion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.information (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('générale', 'maintenance', 'alerte', 'nouveauté', 'autre')) DEFAULT 'générale',
    image BYTEA,
    est_active BOOLEAN DEFAULT TRUE,
    date_debut TIMESTAMP,
    date_fin TIMESTAMP,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);


CREATE TABLE public.publicite (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    image BYTEA,
    logo_entreprise BYTEA,
    url_cible VARCHAR(255),
    type VARCHAR(50) CHECK (type IN ('banniere', 'popup', 'video', 'autre')) DEFAULT 'banniere',
    est_active BOOLEAN DEFAULT TRUE,
    date_debut TIMESTAMP,
    date_fin TIMESTAMP,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);


CREATE TABLE public.politique_utilisation (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text) PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    contenu text NOT NULL,
    version VARCHAR(255) NOT NULL,
    date_publication timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    est_active boolean DEFAULT true,
    plateforme VARCHAR(50) CHECK (plateforme IN ('Osons', 'Restaurant','K-Store','K-Chat', 'toutes')) DEFAULT 'toutes',
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);


CREATE TABLE public.acceptation_politique (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    date_acceptation timestamp without time zone,
    lu_et_accepte boolean DEFAULT false,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    id_politique VARCHAR(12) REFERENCES public.politique_utilisation(id) ON DELETE CASCADE
);

CREATE TABLE public.password_reset_token (
    id VARCHAR(12) DEFAULT encode(gen_random_bytes(6), 'hex') NOT NULL,
    token  VARCHAR(255) NOT NULL,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    expires_at timestamp without time zone NOT NULL
);

-- =============================
-- TABLES DU SCHÉMA restaurant
-- =============================

-- Table categories
CREATE TABLE restaurant.categories (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    name character varying(100) NOT NULL,
    CONSTRAINT categories_name_key UNIQUE (name)
);
-- Table menus
CREATE TABLE restaurant.menus (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY ,
    name character varying(100) NOT NULL,
    image_url VARCHAR(255),
    price numeric(10,2) NOT NULL,
    is_favorite boolean NOT NULL,
    description VARCHAR(255),
    category_id VARCHAR(12) NOT NULL REFERENCES restaurant.categories(id) ON DELETE RESTRICT
);

-- Table company_metrics
CREATE TABLE restaurant.company_metrics (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    total_revenue_deductions numeric(10,2) NOT NULL
);

-- Table footer_settings
CREATE TABLE restaurant.footer_settings (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    address VARCHAR(255),
    phone_number VARCHAR(255),
    email VARCHAR(255),
    title VARCHAR(255),
    history_title VARCHAR(255),
    history_content TEXT,
    restaurant_today_title VARCHAR(255),
    restaurant_today_content TEXT,
    achievements_title VARCHAR(255),
    achievements_content TEXT
);

-- Table gifts
CREATE TABLE restaurant.gifts (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    user_id VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    menu_id VARCHAR(12) NOT NULL REFERENCES restaurant.menus(id) ON DELETE SET NULL,
    offre character varying NOT NULL,
    month_year character varying NOT NULL,
    given_at timestamp without time zone NOT NULL,
    is_claimed boolean NOT NULL,
    claimed_at timestamp without time zone,
    given_by_admin_id VARCHAR (12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);




-- Table orders
CREATE TABLE restaurant.orders (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    user_id VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    assigned_livreur_id VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    status character varying(50) NOT NULL,
    tva_amount numeric(10,2),
    total numeric(10,2),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    updated_by VARCHAR(255),
    delivery_address VARCHAR(255),
    admin_id_prepa VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);

-- Table order_items
CREATE TABLE restaurant.order_items (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12) NOT NULL REFERENCES restaurant.orders(id) ON DELETE CASCADE,
    menu_id VARCHAR(12) NOT NULL REFERENCES restaurant.menus(id) ON DELETE CASCADE,
    quantity integer NOT NULL
);

-- Table order_history
CREATE TABLE restaurant.order_history (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12)NOT NULL REFERENCES restaurant.orders(id) ON DELETE CASCADE,
    ancien_statut character varying NOT NULL,
    nouveau_statut character varying NOT NULL,
    modifie_par VARCHAR(255),
    role VARCHAR(255),
    "timestamp" timestamp without time zone NOT NULL
);

-- Table notifications
CREATE TABLE restaurant.notifications (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    user_id VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    message character varying NOT NULL,
    type character varying NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    read boolean NOT NULL,
    menu_id VARCHAR(12) REFERENCES restaurant.menus(id) ON DELETE SET NULL,
    order_id VARCHAR(12) REFERENCES restaurant.orders(id) ON DELETE SET NULL,
    gift_id VARCHAR(12) REFERENCES restaurant.gifts(id) ON DELETE SET NULL,
    expire_at timestamp without time zone,
    extra_data character varying

);

CREATE TABLE restaurant.livreur_localisation (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    livreur_id VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    "timestamp" timestamp without time zone NOT NULL
);

CREATE TABLE restaurant.password_reset_tokens (
    id VARCHAR(12) DEFAULT encode(gen_random_bytes(6), 'hex') NOT NULL,
    token  VARCHAR(255) NOT NULL,
    id_utilisateur VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    expires_at timestamp without time zone NOT NULL
);

-- Table payments
CREATE TABLE restaurant.payments (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    order_id VARCHAR(12) NOT NULL REFERENCES restaurant.orders(id) ON DELETE CASCADE,
    status character varying NOT NULL,
    transaction_id character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    customer_phone VARCHAR(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);



-- Tables Facture
CREATE TABLE restaurant.facture (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE RESTRICT,
    id_order VARCHAR(12) REFERENCES restaurant.orders(id) ON DELETE RESTRICT,
    total NUMERIC(10, 2),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- TABLES DU SCHÉMA notification
-- =============================

-- Table notification
CREATE TABLE notification.notification (
    id varchar(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'alerte', 'warning', 'promotion', 'evenement', 'systeme')),
    message TEXT NOT NULL,
    est_lu BOOLEAN DEFAULT FALSE,
    est_globale BOOLEAN DEFAULT FALSE,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    id_publication VARCHAR(12) REFERENCES public.publication(id) ON DELETE SET NULL,
    id_product VARCHAR(12) REFERENCES boutique.products(id) ON DELETE SET NULL,
    id_evenement VARCHAR(12) REFERENCES public.evenement(id) ON DELETE SET NULL,
    id_commentaire VARCHAR(12) REFERENCES public.commentaire(id) ON DELETE SET NULL,
    id_reponsecommentaire VARCHAR(12) REFERENCES public.reponsecommentaire(id) ON DELETE SET NULL,
    id_message VARCHAR(12) REFERENCES messagerie.message(id) ON DELETE SET NULL,
    id_groupe VARCHAR(12) REFERENCES messagerie.groupe(id) ON DELETE SET NULL,
    id_reaction VARCHAR(12) REFERENCES public.reaction(id) ON DELETE SET NULL,
    id_historique_connexion VARCHAR(12) REFERENCES public.historique_connexion(id) ON DELETE SET NULL,
    id_mention VARCHAR(12) REFERENCES public.mention(id) ON DELETE SET NULL,
    id_suivi_utilisateur VARCHAR(12) REFERENCES public.suivi_utilisateur(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_lecture TIMESTAMP
);

############################
# Tables du schéma Planer  #
############################

CREATE TABLE IF NOT EXISTS planer.workspace (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id) ON DELETE SET NULL,
    CONSTRAINT workspace_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE RESTRICT
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

-- INDEXES conservés tels quels
-- Index pour améliorer les recherches
CREATE INDEX idx_order_history_order_id ON boutique.order_history(order_id);
CREATE INDEX idx_order_history_timestamp ON boutique.order_history(created_at);
CREATE INDEX idx_order_items_order_id ON boutique.order_items(order_id);
CREATE INDEX idx_order_items_entreprise_id ON boutique.order_items(id_entreprise);
CREATE INDEX idx_order_items_product_id ON boutique.order_items(id_product);
CREATE INDEX idx_utilisateur_email ON public.utilisateur(email);
CREATE INDEX idx_utilisateur_username ON public.utilisateur(username);
CREATE INDEX idx_publication_utilisateur ON public.publication(id_utilisateur);
CREATE INDEX idx_commentaire_publication ON public.commentaire(id_publication);

CREATE INDEX idx_reaction_publication ON public.reaction(id_publication);
CREATE INDEX idx_reaction_utilisateur ON public.reaction(id_utilisateur);
CREATE INDEX idx_evenement_utilisateur ON public.evenement(id_utilisateur);
CREATE INDEX idx_participation_evenement ON public.participation_evenement(id_evenement);
CREATE INDEX idx_donation_utilisateur ON boutique.donation(id_utilisateur);
CREATE INDEX idx_facture_utilisateur ON boutique.facture(id_utilisateur);

CREATE INDEX idx_facture_donation ON boutique.facture(id_donation);
CREATE INDEX idx_photo_product ON boutique.photo(id_product);
CREATE INDEX idx_photo_utilisateur ON boutique.photo(id_utilisateur);
CREATE INDEX idx_reponsecommentaire_utilisateur ON public.reponsecommentaire(id_utilisateur);
CREATE INDEX idx_reponsecommentaire_commentaire ON public.reponsecommentaire(id_commentaire);
CREATE INDEX idx_commentaire_utilisateur ON public.commentaire(id_utilisateur);
CREATE INDEX idx_commentaire_product ON public.commentaire(id_product);
CREATE INDEX idx_commentaire_evenement ON public.commentaire(id_evenement);
CREATE INDEX idx_reaction_commentaire ON public.reaction(id_commentaire);
CREATE INDEX idx_reaction_evenement ON public.reaction(id_evenement);
CREATE INDEX idx_reaction_product ON public.reaction(id_product);
