from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, JSON, LargeBinary, Numeric, PrimaryKeyConstraint, SmallInteger, String, Text, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from typing import List, Optional
import datetime


class Base(DeclarativeBase):
    pass


class Utilisateur(Base):
    __tablename__ = 'utilisateur'
    __table_args__ = (
        CheckConstraint("badge::text = ANY (ARRAY['Aucun'::character varying, 'Bronze'::character varying, 'Argent'::character varying, 'Or'::character varying, 'Platine'::character varying, 'Diamant'::character varying]::text[])", name='utilisateur_badge_check'),
        CheckConstraint("genre::text = ANY (ARRAY['Homme'::character varying, 'Femme'::character varying, 'Autre'::character varying]::text[])", name='utilisateur_genre_check'),
        CheckConstraint("length(email::text) <= 255 AND email::text ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}$'::text", name='utilisateur_constr_email_check'),
        CheckConstraint("statut::text = ANY (ARRAY['Actif'::character varying, 'Suspendu'::character varying, 'Supprimé'::character varying]::text[])", name='utilisateur_constr_statut'),
        PrimaryKeyConstraint('id', name='utilisateur_pk'),
        UniqueConstraint('email', name='utilisateur_constr_email'),
        Index('idx_utilisateur_email', 'email'),
        Index('idx_utilisateur_username', 'username'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    username: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(100))
    statut: Mapped[str] = mapped_column(String(20), server_default=text("'Actif'::character varying"))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    is_utilisateur_verifie: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    is_livreur: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_user: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    is_entreprise: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_admin: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    is_super_admin: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    nom: Mapped[Optional[str]] = mapped_column(String(100))
    prenoms: Mapped[Optional[str]] = mapped_column(String(100))
    mot_de_passe: Mapped[Optional[str]] = mapped_column(String(255))
    email_verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    token_confirmation_email: Mapped[Optional[str]] = mapped_column(String(255))
    date_exp_token_confirmation_email: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    genre: Mapped[Optional[str]] = mapped_column(String(10))
    photo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    date_nais: Mapped[Optional[datetime.date]] = mapped_column(Date)
    pays: Mapped[Optional[str]] = mapped_column(String(100))
    ville: Mapped[Optional[str]] = mapped_column(String(100))
    telephone: Mapped[Optional[str]] = mapped_column(String(20))
    biographie: Mapped[Optional[str]] = mapped_column(Text)
    otp_code: Mapped[Optional[str]] = mapped_column(String(5))
    badge: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Aucun'::character varying"))
    delivery_address: Mapped[Optional[str]] = mapped_column(String(255))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relations
    a_propos: Mapped[List['APropos']] = relationship('APropos', back_populates='utilisateur')
    categorie_evenements: Mapped[List['CategorieEvenements']] = relationship('CategorieEvenements', back_populates='utilisateur')
    categorie_publication: Mapped[List['CategoriePublication']] = relationship('CategoriePublication', back_populates='utilisateur')
    charte: Mapped[List['Charte']] = relationship('Charte', back_populates='utilisateur')
    motdepasseoublie: Mapped[List['Motdepasseoublie']] = relationship('Motdepasseoublie', back_populates='utilisateur')
    motivation: Mapped[List['Motivation']] = relationship('Motivation', back_populates='utilisateur')
    evenement: Mapped[List['Evenement']] = relationship('Evenement', back_populates='utilisateur')
    publication: Mapped[List['Publication']] = relationship('Publication', back_populates='utilisateur')
    commentaire: Mapped[List['Commentaire']] = relationship('Commentaire', back_populates='utilisateur')
    favori: Mapped[List['Favori']] = relationship('Favori', back_populates='utilisateur')
    participation_evenement: Mapped[List['ParticipationEvenement']] = relationship('ParticipationEvenement', back_populates='utilisateur')
    reponsecommentaire: Mapped[List['Reponsecommentaire']] = relationship('Reponsecommentaire', back_populates='utilisateur')
    reaction: Mapped[List['Reaction']] = relationship('Reaction', back_populates='utilisateur')
    historique_connexions: Mapped[List['HistoriqueConnexion']] = relationship('HistoriqueConnexion', back_populates='utilisateur')
    mention_mentionne: Mapped[List['Mention']] = relationship('Mention', back_populates='utilisateur_mentionne')
    suivi_suiveur: Mapped[List['SuiviUtilisateur']] = relationship('SuiviUtilisateur', foreign_keys='SuiviUtilisateur.id_suiveur', back_populates='suiveur')
    suivi_suivi: Mapped[List['SuiviUtilisateur']] = relationship('SuiviUtilisateur', foreign_keys='SuiviUtilisateur.id_suivi', back_populates='suivi')
    story: Mapped[List['Story']] = relationship('Story', back_populates='utilisateur')
    entreprises: Mapped[List['Entreprise']] = relationship('Entreprise', back_populates='utilisateur')
    # Boutique relations
    categories: Mapped[List['Categories']] = relationship('Categories', back_populates='utilisateur')
    reviews: Mapped[List['Reviews']] = relationship('Reviews', back_populates='utilisateur')
    favorites: Mapped[List['Favorites']] = relationship('Favorites', back_populates='utilisateur')
    cart_items: Mapped[List['CartItems']] = relationship('CartItems', back_populates='utilisateur')
    donations: Mapped[List['Donation']] = relationship('Donation', back_populates='utilisateur')
    prixlivraison: Mapped[List['Prixlivraison']] = relationship('Prixlivraison', back_populates='utilisateur')
    factures: Mapped[List['Facture']] = relationship('Facture', back_populates='utilisateur')
    photos: Mapped[List['Photo']] = relationship('Photo', back_populates='utilisateur')
    orders = relationship('Orders', foreign_keys='Orders.id_utilisateur', back_populates='utilisateur')
    livreur_orders = relationship('Orders', foreign_keys='Orders.assigned_livreur_id', back_populates='livreur', overlaps='orders')
    # Notification relations
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='utilisateur')
    notification_messagerie: Mapped[List['NotificationMessagerie']] = relationship('NotificationMessagerie', back_populates='utilisateur')
    publicite: Mapped[List['Publicite']] = relationship('Publicite', back_populates='utilisateur')
    politique: Mapped[List['PolitiqueUtilisation']] = relationship('PolitiqueUtilisation', back_populates='utilisateur')
    acceptations: Mapped[List['AcceptationPolitique']] = relationship('AcceptationPolitique', back_populates='utilisateur')


class Motivation(Base):
    __tablename__ = 'motivation'
    __table_args__ = {'schema': 'public'}

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    description: Mapped[str] = mapped_column(Text)
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='motivation')


class CategoriePublication(Base):
    __tablename__ = 'categorie_publication'
    __table_args__ = {'schema': 'public'}

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='categorie_publication')
    publication: Mapped[List['Publication']] = relationship('Publication', back_populates='categorie_publication')


class CategorieEvenements(Base):
    __tablename__ = 'categorie_evenements'
    __table_args__ = {'schema': 'public'}

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='categorie_evenements')
    evenement: Mapped[List['Evenement']] = relationship('Evenement', back_populates='categorie_evenements')


class Publication(Base):
    __tablename__ = 'publication'
    __table_args__ = (
        Index('idx_publication_utilisateur', 'id_utilisateur'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    photo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    lien_pub: Mapped[Optional[str]] = mapped_column(Text)
    is_valide: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_categorie_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.categorie_publication.id'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='publication')
    categorie_publication: Mapped[Optional['CategoriePublication']] = relationship('CategoriePublication', back_populates='publication')
    commentaire: Mapped[List['Commentaire']] = relationship('Commentaire', back_populates='publication')
    reaction: Mapped[List['Reaction']] = relationship('Reaction', back_populates='publication')
    favori: Mapped[List['Favori']] = relationship('Favori', back_populates='publication')
    mention: Mapped[List['Mention']] = relationship('Mention', back_populates='publication')
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='publication')


class Evenement(Base):
    __tablename__ = 'evenement'
    __table_args__ = (
        CheckConstraint("type::text = ANY (ARRAY['presentiel'::character varying, 'online'::character varying]::text[])", name='evenement_type_check'),
        Index('idx_evenement_utilisateur', 'id_utilisateur'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    lien: Mapped[Optional[str]] = mapped_column(Text)
    type: Mapped[Optional[str]] = mapped_column(String(20))
    photo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    is_valide: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    lien_pub: Mapped[Optional[str]] = mapped_column(Text)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_categorie_evenements: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.categorie_evenements.id'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='evenement')
    categorie_evenements: Mapped[Optional['CategorieEvenements']] = relationship('CategorieEvenements', back_populates='evenement')
    participation_evenement: Mapped[List['ParticipationEvenement']] = relationship('ParticipationEvenement', back_populates='evenement')
    commentaire: Mapped[List['Commentaire']] = relationship('Commentaire', back_populates='evenement')
    reaction: Mapped[List['Reaction']] = relationship('Reaction', back_populates='evenement')
    favori: Mapped[List['Favori']] = relationship('Favori', back_populates='evenement')
    mention: Mapped[List['Mention']] = relationship('Mention', back_populates='evenement')
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='evenement')


class ParticipationEvenement(Base):
    __tablename__ = 'participation_evenement'
    __table_args__ = (
        CheckConstraint("statut::text = ANY (ARRAY['intéressé'::character varying, 'participe'::character varying]::text[])", name='participation_evenement_statut_check'),
        Index('idx_participation_evenement', 'id_evenement'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='RESTRICT'))
    statut: Mapped[Optional[str]] = mapped_column(String(20))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='participation_evenement')
    evenement: Mapped[Optional['Evenement']] = relationship('Evenement', back_populates='participation_evenement')


class APropos(Base):
    __tablename__ = 'a_propos'
    __table_args__ = {'schema': 'public'}

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    qui_sommes_nous: Mapped[Optional[str]] = mapped_column(Text)
    objectifs: Mapped[Optional[str]] = mapped_column(Text)
    vision: Mapped[Optional[str]] = mapped_column(Text)
    photo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    signature: Mapped[Optional[str]] = mapped_column(String(100))
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='a_propos')


class Charte(Base):
    __tablename__ = 'charte'
    __table_args__ = {'schema': 'public'}

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    nom: Mapped[Optional[str]] = mapped_column(String(100))
    prenom: Mapped[Optional[str]] = mapped_column(String(100))
    poste: Mapped[Optional[str]] = mapped_column(String(100))
    signature: Mapped[Optional[str]] = mapped_column(Text)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='charte')


class Commentaire(Base):
    __tablename__ = 'commentaire'
    __table_args__ = (
        Index('idx_commentaire_publication', 'id_publication'),
        Index('idx_commentaire_utilisateur', 'id_utilisateur'),
        Index('idx_commentaire_product', 'id_product'),
        Index('idx_commentaire_evenement', 'id_evenement'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    description: Mapped[str] = mapped_column(Text)
    is_valide: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.publication.id', ondelete='RESTRICT'))
    id_product: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='SET NULL'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='SET NULL'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='commentaire')
    publication: Mapped[Optional['Publication']] = relationship('Publication', back_populates='commentaire')
    products: Mapped[Optional['Products']] = relationship('Products', back_populates='commentaire')
    evenement: Mapped[Optional['Evenement']] = relationship('Evenement', back_populates='commentaire')
    reponsecommentaire: Mapped[List['Reponsecommentaire']] = relationship('Reponsecommentaire', back_populates='commentaire')
    reaction: Mapped[List['Reaction']] = relationship('Reaction', back_populates='commentaire')
    mention: Mapped[List['Mention']] = relationship('Mention', back_populates='commentaire')
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='commentaire')


class Reponsecommentaire(Base):
    __tablename__ = 'reponsecommentaire'
    __table_args__ = (
        Index('idx_reponsecommentaire_utilisateur', 'id_utilisateur'),
        Index('idx_reponsecommentaire_commentaire', 'id_commentaire'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    description: Mapped[str] = mapped_column(Text)
    is_valide: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_commentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.commentaire.id', ondelete='RESTRICT'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='reponsecommentaire')
    commentaire: Mapped[Optional['Commentaire']] = relationship('Commentaire', back_populates='reponsecommentaire')
    reaction: Mapped[List['Reaction']] = relationship('Reaction', back_populates='reponsecommentaire')
    mention: Mapped[List['Mention']] = relationship('Mention', back_populates='reponsecommentaire')
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='reponsecommentaire')


class Reaction(Base):
    __tablename__ = 'reaction'
    __table_args__ = (
        CheckConstraint("type::text = ANY (ARRAY['like'::character varying, 'adore'::character varying, 'smile'::character varying, 'heart'::character varying]::text[])", name='reaction_type_check'),
        Index('idx_reaction_publication', 'id_publication'),
        Index('idx_reaction_utilisateur', 'id_utilisateur'),
        Index('idx_reaction_commentaire', 'id_commentaire'),
        Index('idx_reaction_evenement', 'id_evenement'),
        Index('idx_reaction_product', 'id_product'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    type: Mapped[Optional[str]] = mapped_column(String(20))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.publication.id', ondelete='SET NULL'))
    id_commentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.commentaire.id', ondelete='SET NULL'))
    id_product: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='SET NULL'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='SET NULL'))
    id_reponsecommentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.reponsecommentaire.id', ondelete='SET NULL'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='reaction')
    publication: Mapped[Optional['Publication']] = relationship('Publication', back_populates='reaction')
    commentaire: Mapped[Optional['Commentaire']] = relationship('Commentaire', back_populates='reaction')
    products: Mapped[Optional['Products']] = relationship('Products', back_populates='reaction')
    evenement: Mapped[Optional['Evenement']] = relationship('Evenement', back_populates='reaction')
    reponsecommentaire: Mapped[Optional['Reponsecommentaire']] = relationship('Reponsecommentaire', back_populates='reaction')
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='reaction')


class Favori(Base):
    __tablename__ = 'favori'
    __table_args__ = (
        CheckConstraint("((id_publication IS NOT NULL)::integer + (id_product IS NOT NULL)::integer + (id_evenement IS NOT NULL)::integer) = 1", name='favori_unique'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    id_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.publication.id', ondelete='SET NULL'))
    id_product: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='SET NULL'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='SET NULL'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='favori')
    publication: Mapped[Optional['Publication']] = relationship('Publication', back_populates='favori')
    products: Mapped[Optional['Products']] = relationship('Products', back_populates='favori')
    evenement: Mapped[Optional['Evenement']] = relationship('Evenement', back_populates='favori')


class Mention(Base):
    __tablename__ = 'mention'
    __table_args__ = (
        CheckConstraint("mention_speciale::text = ANY (ARRAY['toutlemonde'::character varying, 'followers'::character varying, 'admin'::character varying, 'superadmin'::character varying, 'alaune'::character varying, 'membre'::character varying, 'autre'::character varying]::text[])", name='mention_mention_speciale_check'),
        PrimaryKeyConstraint('id', name='mention_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur_mentionne: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    mention_speciale: Mapped[Optional[str]] = mapped_column(String(20))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_commentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.commentaire.id', ondelete='CASCADE'))
    id_reponse_commentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.reponsecommentaire.id', ondelete='CASCADE'))
    id_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.publication.id', ondelete='CASCADE'))
    id_message: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.message.id', ondelete='CASCADE'))
    id_groupe: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.groupe.id', ondelete='CASCADE'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='CASCADE'))

    # Relations
    utilisateur_mentionne: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_utilisateur_mentionne])
    commentaire: Mapped[Optional['Commentaire']] = relationship('Commentaire', foreign_keys=[id_commentaire])
    reponsecommentaire: Mapped[Optional['Reponsecommentaire']] = relationship('Reponsecommentaire', foreign_keys=[id_reponse_commentaire])
    publication: Mapped[Optional['Publication']] = relationship('Publication', foreign_keys=[id_publication])
    message: Mapped[Optional['Message']] = relationship('Message', foreign_keys=[id_message])
    groupe: Mapped[Optional['Groupe']] = relationship('Groupe', foreign_keys=[id_groupe])
    evenement: Mapped[Optional['Evenement']] = relationship('Evenement', foreign_keys=[id_evenement])


class SuiviUtilisateur(Base):
    __tablename__ = 'suivi_utilisateur'
    __table_args__ = (
        CheckConstraint('id_suiveur <> id_suivi', name='suivi_utilisateur_check'),
        UniqueConstraint('id_suiveur', 'id_suivi', name='unique_suivi'),
        PrimaryKeyConstraint('id', name='suivi_utilisateur_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_suiveur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    id_suivi: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    date_suivi: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    suiveur: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_suiveur])
    suivi: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_suivi])


class Story(Base):
    __tablename__ = 'story'
    __table_args__ = (
        CheckConstraint("type_contenu::text = ANY (ARRAY['texte'::character varying, 'image'::character varying, 'video'::character varying, 'audio'::character varying, 'texte_audio'::character varying, 'musique'::character varying]::text[])", name='story_type_contenu_check'),
        CheckConstraint("type_medias::text = ANY (ARRAY['image'::character varying, 'video'::character varying, 'audio'::character varying, 'texte_audio'::character varying, 'musique'::character varying]::text[])", name='story_type_medias_check'),
        CheckConstraint("visibilite::text = ANY (ARRAY['public'::character varying, 'prive'::character varying, 'followers'::character varying, 'groupe'::character varying, 'autre'::character varying]::text[])", name='story_visibilite_check'),
        PrimaryKeyConstraint('id', name='story_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    utilisateur_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    type_contenu: Mapped[str] = mapped_column(String(20))
    visibilite: Mapped[str] = mapped_column(String(20), server_default=text("'public'::character varying"))
    duree: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('15'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    est_visible: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    contenu_texte: Mapped[Optional[str]] = mapped_column(Text)
    medias: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    type_medias: Mapped[Optional[str]] = mapped_column(String(50))
    date_expiration: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='story')


class Motdepasseoublie(Base):
    __tablename__ = 'motdepasseoublie'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='motdepasseoublie_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    token_reinitialisation_mdp: Mapped[Optional[str]] = mapped_column(String(255))
    date_exp_token_reinitialisation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='motdepasseoublie')


class HistoriqueConnexion(Base):
    __tablename__ = 'historique_connexion'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='historique_connexion_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    date_connexion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_deconnexion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    est_reussi: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    adresse_ip: Mapped[Optional[str]] = mapped_column(String(45))
    navigateur: Mapped[Optional[str]] = mapped_column(String(255))
    systeme_exploitation: Mapped[Optional[str]] = mapped_column(String(255))
    localisation: Mapped[Optional[str]] = mapped_column(String(255))
    appareil: Mapped[Optional[str]] = mapped_column(String(255))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='historique_connexions')

class Information(Base):
    __tablename__ = 'information'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='information_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(255))
    contenu: Mapped[str] = mapped_column(Text)
    type: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'générale'::character varying"))
    image: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    est_active: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    date_debut: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    date_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur')


class Publicite(Base):
    __tablename__ = 'publicite'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='publicite_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    image: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    logo_entreprise: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    url_cible: Mapped[Optional[str]] = mapped_column(String(255))
    type: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'banniere'::character varying"))
    est_active: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    date_debut: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    date_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='publicite')

class PolitiqueUtilisation(Base):
    __tablename__ = 'politique_utilisation'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='politique_utilisation_pk'),
        CheckConstraint(
            "plateforme IN ('Osons', 'Restaurant','K-Store','K-Chat', 'toutes')",
            name='politique_utilisation_plateforme_check'
        ),
        {'schema': 'public'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(255), nullable=False)
    contenu: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(String(255), nullable=False)
    date_publication: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    est_active: Mapped[bool] = mapped_column(Boolean, server_default=text('true'))
    plateforme: Mapped[str] = mapped_column(String(50), server_default=text("'toutes'"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur')
    acceptations: Mapped[List['AcceptationPolitique']] = relationship('AcceptationPolitique', back_populates='politique')


class AcceptationPolitique(Base):
    __tablename__ = 'acceptation_politique'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='acceptation_politique_pk'),
        {'schema': 'public'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    date_acceptation: Mapped[datetime.datetime] = mapped_column(DateTime)
    lu_et_accepte: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    id_politique: Mapped[str] = mapped_column(String(12), ForeignKey('public.politique_utilisation.id', ondelete='CASCADE'))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur')
    politique: Mapped['PolitiqueUtilisation'] = relationship('PolitiqueUtilisation', back_populates='acceptations')

class Notification(Base):
    __tablename__ = 'notification'
    __table_args__ = (
        CheckConstraint("type::text = ANY (ARRAY['info'::character varying, 'alerte'::character varying, 'warning'::character varying, 'promotion'::character varying, 'evenement'::character varying, 'systeme'::character varying]::text[])", name='notification_type_check'),
        PrimaryKeyConstraint('id', name='notification_pkey'),
        {'schema': 'notification'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    type: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(Text)
    est_lu: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    est_globale: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_lecture: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    id_publication: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.publication.id', ondelete='SET NULL'))
    id_product: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='SET NULL'))
    id_evenement: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.evenement.id', ondelete='SET NULL'))
    id_commentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.commentaire.id', ondelete='SET NULL'))
    id_reponsecommentaire: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.reponsecommentaire.id', ondelete='SET NULL'))
    id_message: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.message.id', ondelete='SET NULL'))
    id_groupe: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.groupe.id', ondelete='SET NULL'))
    id_reaction: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.reaction.id', ondelete='SET NULL'))
    id_historique_connexion: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.historique_connexion.id', ondelete='SET NULL'))
    id_mention: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.mention.id', ondelete='SET NULL'))
    id_suivi_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.suivi_utilisateur.id', ondelete='SET NULL'))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', foreign_keys=[id_utilisateur])
    publication: Mapped[Optional['Publication']] = relationship('Publication', foreign_keys=[id_publication])
    products: Mapped[Optional['Products']] = relationship('Products', foreign_keys=[id_product])
    evenement: Mapped[Optional['Evenement']] = relationship('Evenement', foreign_keys=[id_evenement])
    commentaire: Mapped[Optional['Commentaire']] = relationship('Commentaire', foreign_keys=[id_commentaire])
    reponsecommentaire: Mapped[Optional['Reponsecommentaire']] = relationship('Reponsecommentaire', foreign_keys=[id_reponsecommentaire])
    message: Mapped[Optional['Message']] = relationship('Message', foreign_keys=[id_message])
    groupe: Mapped[Optional['Groupe']] = relationship('Groupe', foreign_keys=[id_groupe])
    reaction: Mapped[Optional['Reaction']] = relationship('Reaction', foreign_keys=[id_reaction])
    historique_connexion: Mapped[Optional['HistoriqueConnexion']] = relationship('HistoriqueConnexion', foreign_keys=[id_historique_connexion])
    mention: Mapped[Optional['Mention']] = relationship('Mention', foreign_keys=[id_mention])
    suivi_utilisateur: Mapped[Optional['SuiviUtilisateur']] = relationship('SuiviUtilisateur', foreign_keys=[id_suivi_utilisateur])


# Classes pour les schémas messagerie
class Room(Base):
    __tablename__ = 'room'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='room_pkey'),
        {'schema': 'messagerie'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    member1: Mapped[str] = mapped_column(String(255))
    member2: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    messages: Mapped[List['Message']] = relationship('Message', back_populates='room')


class Groupe(Base):
    __tablename__ = 'groupe'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='groupe_pkey'),
        {'schema': 'messagerie'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    name: Mapped[str] = mapped_column(String(255))
    creator: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    messages: Mapped[List['Message']] = relationship('Message', back_populates='groupe')
    members: Mapped[List['GroupeMembers']] = relationship('GroupeMembers', back_populates='groupe')


class Message(Base):
    __tablename__ = 'message'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='message_pkey'),
        {'schema': 'messagerie'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    sender: Mapped[str] = mapped_column(String(255))
    id_room: Mapped[str] = mapped_column(String(12), ForeignKey('messagerie.room.id', ondelete='RESTRICT'))
    type: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'text'::character varying"))
    seen: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    message: Mapped[Optional[str]] = mapped_column(Text)
    audio: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    file: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    image: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    video: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    id_groupe: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.groupe.id', ondelete='SET NULL'))

    # Relations
    room: Mapped['Room'] = relationship('Room', back_populates='messages')
    groupe: Mapped[Optional['Groupe']] = relationship('Groupe', back_populates='messages')


class GroupeMembers(Base):
    __tablename__ = 'groupe_members'
    __table_args__ = (
        PrimaryKeyConstraint('id_groupe', 'member', name='groupe_members_pkey'),
        {'schema': 'messagerie'}
    )

    id_groupe: Mapped[str] = mapped_column(String(12), ForeignKey('messagerie.groupe.id', ondelete='CASCADE'), primary_key=True)
    member: Mapped[str] = mapped_column(String(255), primary_key=True)

    # Relations
    groupe: Mapped['Groupe'] = relationship('Groupe', back_populates='members')


class NotificationMessagerie(Base):
    __tablename__ = 'notification'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='notification_messagerie_pkey'),
        {'schema': 'messagerie'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    type: Mapped[str] = mapped_column(String(50))
    est_lu: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_groupe: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('messagerie.groupe.id', ondelete='SET NULL'))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_utilisateur])
    groupe: Mapped[Optional['Groupe']] = relationship('Groupe', foreign_keys=[id_groupe])


#######################################
# Classes pour les schémas boutique   #
#######################################

class Entreprise(Base):
    __tablename__ = 'entreprise'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='entreprise_pkey'),
        Index('idx_entreprise_utilisateur', 'id_utilisateur'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    statut_juridique: Mapped[Optional[str]] = mapped_column(String(255))
    adresse: Mapped[Optional[str]] = mapped_column(String(255))
    telephone: Mapped[Optional[str]] = mapped_column(String(20))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    numero_ifu : Mapped[Optional[str]] = mapped_column(String(13))
    numero_rccm: Mapped[Optional[str]] = mapped_column(String(50))
    nom_responsable_entreprise: Mapped[Optional[str]] = mapped_column(String(50))
    prenoms_responsable_entreprise: Mapped[Optional[str]] = mapped_column(String(255))
    telephone_responsable_entreprise: Mapped[Optional[str]] = mapped_column(String(20))
    site_web: Mapped[Optional[str]] = mapped_column(String(255))
    logo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    date_creation_entreprise: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='entreprises')
    favorites: Mapped[List['Favorites']] = relationship('Favorites', back_populates='entreprises')
    reviews: Mapped[List['Reviews']] = relationship('Reviews', back_populates='entreprises')
    products: Mapped[List['Products']] = relationship('Products', back_populates='entreprises')
    order_items: Mapped[List['OrderItems']] = relationship('OrderItems', back_populates='entreprises')
    cart_items: Mapped[List['CartItems']] = relationship('CartItems', back_populates='entreprises')
    photos: Mapped[List['Photo']] = relationship('Photo', back_populates='entreprises')
    orders_entreprises: Mapped[List['OrdersEntreprise']] = relationship('OrdersEntreprise', back_populates='entreprises')
    entreprise_wallet: Mapped[Optional['EntrepriseWallet']] = relationship('EntrepriseWallet', back_populates='entreprises')
    entreprise_wallet_ledger: Mapped[List['EntrepriseWalletLedger']] = relationship('EntrepriseWalletLedger', back_populates='entreprises')
    entreprise_withdrawals: Mapped[List['EntrepriseWithdrawals']] = relationship('EntrepriseWithdrawals', back_populates='entreprises')
    
class Products(Base):
    __tablename__ = 'products'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='products_pkey'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    name: Mapped[str] = mapped_column(String(255))
    price: Mapped[Numeric] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer)
    id_entreprise: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('CURRENT_TIMESTAMP'))
    description: Mapped[Optional[str]] = mapped_column(Text)
    id_categorie: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.categories.id', ondelete='SET NULL'))
    image_url: Mapped[Optional[str]] = mapped_column(String(255))

    # Relations
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='products')
    categories: Mapped[Optional['Categories']] = relationship('Categories', back_populates='products')
    reviews: Mapped[List['Reviews']] = relationship('Reviews', back_populates='products')
    favorites: Mapped[List['Favorites']] = relationship('Favorites', back_populates='products')
    order_items: Mapped[List['OrderItems']] = relationship('OrderItems', back_populates='products')
    cart_items: Mapped[List['CartItems']] = relationship('CartItems', back_populates='products')
    photos: Mapped[List['Photo']] = relationship('Photo', back_populates='products')
    commentaire: Mapped[List['Commentaire']] = relationship('Commentaire', back_populates='products')
    reaction: Mapped[List['Reaction']] = relationship('Reaction', back_populates='products')
    favori: Mapped[List['Favori']] = relationship('Favori', back_populates='products')
    notification: Mapped[List['Notification']] = relationship('Notification', back_populates='products')


class FooterSettings(Base):
    __tablename__ = 'footer_settings'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='footer_settings_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    address: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255))
    history_title: Mapped[str] = mapped_column(String(255))
    history_content: Mapped[str] = mapped_column(Text)
    boutique_today_title: Mapped[str] = mapped_column(String(255))
    boutique_today_content: Mapped[str] = mapped_column(Text)
    achievements_title: Mapped[str] = mapped_column(String(255))
    achievements_content: Mapped[str] = mapped_column(Text)
    copyright: Mapped[str] = mapped_column(String(255))

class TvaSettings(Base):
    __tablename__ = 'tva_settings'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tva_settings_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    tva_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=18.0)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_by: Mapped[Optional[str]] = mapped_column(String(255))

class Categories(Base):
    __tablename__ = 'categories'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='categories_pkey'),
        UniqueConstraint('name', name='categories_name_key'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    name: Mapped[str] = mapped_column(String(100))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='categories')
    products: Mapped[List['Products']] = relationship('Products', back_populates='categories')


class Reviews(Base):
    __tablename__ = 'reviews'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='reviews_pkey'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    id_entreprise: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='SET NULL'))
    id_product: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='CASCADE'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('CURRENT_TIMESTAMP'))
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    comment: Mapped[Optional[str]] = mapped_column(Text)

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='reviews')
    products: Mapped['Products'] = relationship('Products', back_populates='reviews')
    entreprises: Mapped[Optional['Entreprise']] = relationship('Entreprise', back_populates='reviews')


class Orders(Base):
    __tablename__ = 'orders'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='orders_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    assigned_livreur_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    status: Mapped[str] = mapped_column(String(50))
    tva_amount: Mapped[float] = mapped_column(Numeric(10,2), default=0.0)
    shipping_cost: Mapped[float] = mapped_column(Numeric(10,2), default=0.0)
    total: Mapped[float] = mapped_column(Numeric(10,2))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    updated_by: Mapped[str] = mapped_column(String(255))
    delivery_address: Mapped[str] = mapped_column(String(255))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_utilisateur])
    livreur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', foreign_keys=[assigned_livreur_id])
    payments: Mapped[list['Payments']] = relationship('Payments', back_populates='order')
    orders_entreprises: Mapped[List['OrdersEntreprise']] = relationship('OrdersEntreprise', back_populates='order')
    order_items: Mapped[List['OrderItems']] = relationship('OrderItems', back_populates='order')
    history: Mapped[List['OrderHistory']] = relationship('OrderHistory', back_populates='order')
    factures: Mapped[List['Facture']] = relationship('Facture', back_populates='order')

class OrdersEntreprise(Base):
    __tablename__ = 'orders_entreprise'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='orders_entreprise_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.orders.id', ondelete='CASCADE'))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    subtotal_products: Mapped[float] = mapped_column(Numeric(10,2), default=0.0)
    status: Mapped[str] = mapped_column(String(50))
    created_at : Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at : Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    order: Mapped['Orders'] = relationship('Orders', back_populates='orders_entreprises')
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='orders_entreprises')
    
class OrderItems(Base):
    __tablename__ = 'order_items'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='order_items_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.orders.id', ondelete='SET NULL'))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='SET NULL'))
    product_id: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='SET NULL'))
    product_name_snapshot: Mapped[str] = mapped_column(String(255))
    unit_price_snapshot: Mapped[float] = mapped_column(Numeric(10,2))
    quantity: Mapped[int] = mapped_column(Integer)
    line_total : Mapped[float] = mapped_column(Numeric(10,2))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    order: Mapped['Orders'] = relationship('Orders', back_populates='order_items')
    products: Mapped['Products'] = relationship('Products', back_populates='order_items')   
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='order_items')
    

class EntrepriseWallet(Base):
    __tablename__ = 'entreprise_wallet'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='entreprise_wallet_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='CASCADE'))
    pending_balance: Mapped[float] = mapped_column(Numeric(10,2), default=0.0)
    available_balance: Mapped[float] = mapped_column(Numeric(10,2), default=0.0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='entreprise_wallet')

class EntrepriseWithdrawals(Base):
    __tablename__ = 'entreprise_withdrawals'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='entreprise_withdrawals_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    requested_gross_amount: Mapped[float] = mapped_column(Numeric(12,2))
    fee_rate_snapshot: Mapped[float] = mapped_column(Numeric(5,2))
    fee_amount: Mapped[float] = mapped_column(Numeric(12,2))
    net_paid_amount: Mapped[float] = mapped_column(Numeric(12,2))
    status: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    
    # Relations
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='entreprise_withdrawals')
    entreprise_wallet_ledger: Mapped[List['EntrepriseWalletLedger']] = relationship('EntrepriseWalletLedger', back_populates='enterprise_withdrawals')

class EntrepriseWalletLedger(Base):
    __tablename__ = 'entreprise_wallet_ledger'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='entreprise_wallet_ledger_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    id_order_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.orders_entreprise.id', ondelete='RESTRICT'))
    id_withdrawal: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.entreprise_withdrawals.id', ondelete='RESTRICT'))
    movement_type: Mapped[str] = mapped_column(String(20))  # 'credit' ou 'debit'
    amount: Mapped[float] = mapped_column(Numeric(10,2))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='entreprise_wallet_ledger')
    enterprise_withdrawals: Mapped[Optional['EntrepriseWithdrawals']] = relationship('EntrepriseWithdrawals', back_populates='entreprise_wallet_ledger')

   
class OrderHistory(Base):
    __tablename__ = 'order_history'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='order_history_pkey'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.orders.id', ondelete='RESTRICT'))
    ancien_statut: Mapped[str] = mapped_column(Text)
    nouveau_statut: Mapped[str] = mapped_column(Text)
    modifie_par: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime)

    # Relations
    order: Mapped['Orders'] = relationship('Orders', back_populates='history')


class Favorites(Base):
    __tablename__ = 'favorites'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='favorites_pkey'),
        UniqueConstraint('id_utilisateur', 'id_product', name='favorites_id_utilisateur_id_product_key'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_entreprise: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    id_product: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='RESTRICT'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('CURRENT_TIMESTAMP'))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='favorites')
    products: Mapped['Products'] = relationship('Products', back_populates='favorites')
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='favorites')

class Payments(Base):
    __tablename__ = 'payments'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='payments_pkey'),
        UniqueConstraint('transaction_id', name='payments_transaction_id_key'),
        {'schema': 'boutique'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.orders.id', ondelete='RESTRICT'))
    status: Mapped[str] = mapped_column(Text)
    transaction_id: Mapped[str] = mapped_column(String(50))
    amount: Mapped[float] = mapped_column(Numeric(10,2))
    customer_phone: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    
    # Relations
    order: Mapped['Orders'] = relationship('Orders', back_populates='payments')


class CartItems(Base):
    __tablename__ = 'cart_items'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='cart_items_pkey'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_entreprise: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    id_product: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='RESTRICT'))
    quantity: Mapped[int] = mapped_column(Integer)

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='cart_items')
    products: Mapped['Products'] = relationship('Products', back_populates='cart_items')
    entreprises: Mapped['Entreprise'] = relationship('Entreprise', back_populates='cart_items')
    

class Facture(Base):
    __tablename__ = 'facture'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='facture_pkey'),
        Index('idx_facture_utilisateur', 'id_utilisateur'),
        Index('idx_facture_donation', 'id_donation'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('boutique.orders.id', ondelete='RESTRICT'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_donation: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.donation.id', ondelete='RESTRICT'))
    total: Mapped[Optional[Numeric]] = mapped_column(Numeric(10, 2))
    reference: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(String(255))
    id_transaction: Mapped[Optional[str]] = mapped_column(String(20))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='factures')
    donation: Mapped[Optional['Donation']] = relationship('Donation', back_populates='factures')
    order: Mapped['Orders'] = relationship('Orders', back_populates='factures')

class Photo(Base):
    __tablename__ = 'photo'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='photo_pkey'),
        Index('idx_photo_product', 'id_product'),
        Index('idx_photo_utilisateur', 'id_utilisateur'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_sup: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    image: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    id_product: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.products.id', ondelete='RESTRICT'))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_entreprise: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('boutique.entreprise.id', ondelete='RESTRICT'))
    
    # Relations
    products: Mapped[Optional['Products']] = relationship('Products', back_populates='photos')
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', back_populates='photos')
    entreprises: Mapped[Optional['Entreprise']] = relationship('Entreprise', back_populates='photos')


class Donation(Base):
    __tablename__ = 'donation'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='donation_pkey'),
        Index('idx_donation_utilisateur', 'id_utilisateur'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    date_creation: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    montant: Mapped[Optional[Numeric]] = mapped_column(Numeric(10, 2))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='donations')
    factures: Mapped[List['Facture']] = relationship('Facture', back_populates='donation')

class Prixlivraison(Base):
    __tablename__ = 'prixlivraison'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='prixlivraison_pkey'),
        Index('idx_prixlivraison_utilisateur', 'id_utilisateur'),
        {'schema': 'boutique'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    ville: Mapped[Optional[str]] = mapped_column(String(255))
    prix: Mapped[Optional[Numeric]] = mapped_column(Numeric(10, 2))

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', back_populates='prixlivraison')



###### RESTAURANT ######
# ...existing code...

class RestaurantCategories(Base):
    __tablename__ = 'categories'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='categories_pkey'),
        UniqueConstraint('name', name='categories_name_key'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    name: Mapped[str] = mapped_column(String(100))

    menu: Mapped[list['RestaurantMenus']] = relationship('RestaurantMenus', back_populates='category')

class RestaurantCompanyMetrics(Base):
    __tablename__ = 'company_metrics'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='company_metrics_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    total_revenue_deductions: Mapped[float] = mapped_column(Numeric(10,2))

class RestaurantFooterSettings(Base):
    __tablename__ = 'footer_settings'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='footer_settings_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    address: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255))
    history_title: Mapped[str] = mapped_column(String(255))
    history_content: Mapped[str] = mapped_column(Text)
    restaurant_today_title: Mapped[str] = mapped_column(String(255))
    restaurant_today_content: Mapped[str] = mapped_column(Text)
    achievements_title: Mapped[str] = mapped_column(String(255))
    achievements_content: Mapped[str] = mapped_column(Text)

class RestaurantMenus(Base):
    __tablename__ = 'menus'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='menus_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    name: Mapped[str] = mapped_column(String(100))
    image_url: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Numeric(10,2))
    is_favorite: Mapped[bool] = mapped_column(Boolean)
    description: Mapped[str] = mapped_column(String(255))
    category_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.categories.id', ondelete='RESTRICT'))

    category: Mapped['RestaurantCategories'] = relationship('RestaurantCategories', back_populates='menu')
    gifts: Mapped[list['RestaurantGifts']] = relationship('RestaurantGifts', back_populates='menu')
    order_items: Mapped[list['RestaurantOrderItems']] = relationship('RestaurantOrderItems', back_populates='menu')
    notifications: Mapped[list['RestaurantNotifications']] = relationship('RestaurantNotifications', back_populates='menu')


class RestaurantGifts(Base):
    __tablename__ = 'gifts'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='gifts_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    user_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    menu_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.menus.id', ondelete='SET NULL'))
    offre: Mapped[str] = mapped_column(Text)
    month_year: Mapped[str] = mapped_column(Text)
    given_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    is_claimed: Mapped[bool] = mapped_column(Boolean)
    claimed_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    given_by_admin_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    menu: Mapped['RestaurantMenus'] = relationship('RestaurantMenus', back_populates='gifts')
    notifications: Mapped[list['RestaurantNotifications']] = relationship('RestaurantNotifications', back_populates='gift')

class RestaurantNotifications(Base):
    __tablename__ = 'notifications'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='notifications_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    user_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime)
    read: Mapped[bool] = mapped_column(Boolean)
    menu_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.menus.id', ondelete='SET NULL'))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.orders.id', ondelete='SET NULL'))
    gift_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.gifts.id', ondelete='SET NULL'))
    expire_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    extra_data: Mapped[str] = mapped_column(Text)

    menu: Mapped[Optional['RestaurantMenus']] = relationship('RestaurantMenus', back_populates='notifications')
    order: Mapped[Optional['RestaurantOrders']] = relationship('RestaurantOrders', back_populates='notifications')
    gift: Mapped[Optional['RestaurantGifts']] = relationship('RestaurantGifts', back_populates='notifications')

class RestaurantOrderHistory(Base):
    __tablename__ = 'order_history'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='order_history_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.orders.id', ondelete='CASCADE'))
    ancien_statut: Mapped[str] = mapped_column(Text)
    nouveau_statut: Mapped[str] = mapped_column(Text)
    modifie_par: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime)

    order: Mapped['RestaurantOrders'] = relationship('RestaurantOrders', back_populates='history')

class RestaurantOrderItems(Base):
    __tablename__ = 'order_items'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='order_items_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.orders.id', ondelete='CASCADE'))
    menu_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.menus.id', ondelete='CASCADE'))
    quantity: Mapped[int] = mapped_column(Integer)

    order: Mapped['RestaurantOrders'] = relationship('RestaurantOrders', back_populates='items')
    menu: Mapped['RestaurantMenus'] = relationship('RestaurantMenus', back_populates='order_items')

class RestaurantOrders(Base):
    __tablename__ = 'orders'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='orders_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    user_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    assigned_livreur_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    status: Mapped[str] = mapped_column(String(50))
    tva_amount: Mapped[float] = mapped_column(Numeric(10,2))
    total: Mapped[float] = mapped_column(Numeric(10,2))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    updated_by: Mapped[str] = mapped_column(String(255))
    delivery_address: Mapped[str] = mapped_column(String(255))
    admin_id_prepa: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))

    items: Mapped[list['RestaurantOrderItems']] = relationship('RestaurantOrderItems', back_populates='order')
    history: Mapped[list['RestaurantOrderHistory']] = relationship('RestaurantOrderHistory', back_populates='order')
    notifications: Mapped[list['RestaurantNotifications']] = relationship('RestaurantNotifications', back_populates='order')
    payments: Mapped[list['RestaurantPayments']] = relationship('RestaurantPayments', back_populates='order')
    facture: Mapped[list['RestaurantFacture']] = relationship('RestaurantFacture', back_populates='order')
    user: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[user_id])
    livreur_user: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', foreign_keys=[assigned_livreur_id])
    admin_prepa: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', foreign_keys=[admin_id_prepa])

class RestaurantPayments(Base):
    __tablename__ = 'payments'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='payments_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.orders.id', ondelete='CASCADE'))
    status: Mapped[str] = mapped_column(Text)
    transaction_id: Mapped[str] = mapped_column(String(50))
    amount: Mapped[float] = mapped_column(Numeric(10,2))
    customer_phone: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime)

    order: Mapped['RestaurantOrders'] = relationship('RestaurantOrders', back_populates='payments')

class RestaurantFacture(Base):
    __tablename__ = 'facture'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='facture_pkey'),
        {'schema': 'restaurant'}
    )
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    id_order: Mapped[str] = mapped_column(String(12), ForeignKey('restaurant.orders.id', ondelete='RESTRICT'))
    total: Mapped[float] = mapped_column(Numeric(10,2))
    date_creation: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    date_modif: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    order: Mapped['RestaurantOrders'] = relationship('RestaurantOrders', back_populates='facture')



    class RestaurantLivreurLocalisation(Base):
        __tablename__ = 'livreur_localisation'
        __table_args__ = (
            PrimaryKeyConstraint('id', name='livreur_localisation_pkey'),
            {'schema': 'restaurant'}
        )
        id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
        livreur_id: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
        latitude: Mapped[float] = mapped_column(Numeric(10, 6))
        longitude: Mapped[float] = mapped_column(Numeric(10, 6))
        timestamp: Mapped[datetime.datetime] = mapped_column(DateTime)

        livreur: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[livreur_id])

class RestaurantPasswordResetToken(Base):
    __tablename__ = 'password_reset_tokens'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='password_reset_token_pkey'),
        Index('idx_password_reset_token_utilisateur', 'id_utilisateur'),
        {'schema': 'restaurant'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    token: Mapped[str] = mapped_column(String(255), unique=True)
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_utilisateur])

class PasswordResetToken(Base):
    __tablename__ = 'password_reset_token'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='password_reset_token_pkey'),
        Index('idx_password_reset_token_utilisateur', 'id_utilisateur'),
        {'schema': 'public'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    token: Mapped[str] = mapped_column(String(255), unique=True)
    id_utilisateur: Mapped[str] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='CASCADE'))
    expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relations
    utilisateur: Mapped['Utilisateur'] = relationship('Utilisateur', foreign_keys=[id_utilisateur])


######################################
#    Class du schema planer 
######################################


class Workspace(Base):
    __tablename__ = 'workspace'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='workspace_pkey'),
        Index('idx_workspace_utilisateur', 'id_utilisateur'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='RESTRICT'))
    
    # Relations
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', foreign_keys=[id_utilisateur])
    espaces: Mapped[List['Espace']] = relationship('Espace', back_populates='workspace')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='workspace')
    listes: Mapped[List['Liste']] = relationship('Liste', back_populates='workspace')


class Espace(Base):
    __tablename__ = 'espace'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='espace_pkey'),
        Index('idx_espace_parent', 'id_espace_parent'),
        Index('idx_espace_workspace', 'id_workspace'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(150))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_espace_parent: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.espace.id', ondelete='CASCADE'))
    id_workspace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.workspace.id', ondelete='CASCADE'))
    
    # Relations
    espace_parent: Mapped[Optional['Espace']] = relationship('Espace', remote_side='Espace.id', back_populates='sous_espaces')
    sous_espaces: Mapped[List['Espace']] = relationship('Espace', back_populates='espace_parent')
    workspace: Mapped[Optional['Workspace']] = relationship('Workspace', back_populates='espaces')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='espace')
    listes: Mapped[List['Liste']] = relationship('Liste', back_populates='espace')


class Membre(Base):
    __tablename__ = 'membre'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='membre_pkey'),
        Index('idx_membre_utilisateur', 'id_utilisateur'),
        Index('idx_membre_workspace', 'id_workspace'),
        Index('idx_membre_espace', 'id_espace'),
        Index('idx_membre_liste', 'id_liste'),
        Index('idx_membre_tache', 'id_tache'),
        Index('idx_membre_role', 'role'),
        Index('idx_membre_statut', 'statut'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    role: Mapped[str] = mapped_column(String(30))
    statut: Mapped[str] = mapped_column(String(30))
    id_utilisateur: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('public.utilisateur.id', ondelete='SET NULL'))
    id_workspace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.workspace.id', ondelete='SET NULL'))
    id_espace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.espace.id', ondelete='SET NULL'))
    id_liste: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.liste.id', ondelete='SET NULL'))
    id_tache: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.tache.id', ondelete='SET NULL'))
    utilisateur: Mapped[Optional['Utilisateur']] = relationship('Utilisateur', foreign_keys=[id_utilisateur])
    workspace: Mapped[Optional['Workspace']] = relationship('Workspace', back_populates='membres')
    espace: Mapped[Optional['Espace']] = relationship('Espace', back_populates='membres')
    liste: Mapped[Optional['Liste']] = relationship('Liste', back_populates='membres')
    tache: Mapped[Optional['Tache']] = relationship('Tache', back_populates='membres')
    fichiers: Mapped[List['Fichier']] = relationship('Fichier', back_populates='membre')
    rapports: Mapped[List['Rapport']] = relationship('Rapport', back_populates='membre')
    absences_et_conges: Mapped[List['AbsenceEtConge']] = relationship('AbsenceEtConge', back_populates='membre')


class Fichier(Base):
    __tablename__ = 'fichier'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='fichier_pkey'),
        Index('idx_fichier_membre', 'id_membre'),
        Index('idx_fichier_type_fichier', 'type_fichier'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(255))
    url_fichier: Mapped[Optional[str]] = mapped_column(String(255))
    type_fichier: Mapped[Optional[str]] = mapped_column(String(20))
    meta_donnees: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_membre: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.membre.id', ondelete='SET NULL'))

    # Relations
    membre: Mapped[Optional['Membre']] = relationship('Membre', back_populates='fichiers')


class Rapport(Base):
    __tablename__ = 'rapport'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='rapport_pkey'),
        Index('idx_rapport_membre', 'id_membre'),
        Index('idx_rapport_periode_debut', 'periode_debut'),
        Index('idx_rapport_periode_fin', 'periode_fin'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(150))
    realisations: Mapped[Optional[str]] = mapped_column(Text)
    difficultes_et_solutions: Mapped[Optional[str]] = mapped_column(Text)
    commentaire: Mapped[Optional[str]] = mapped_column(Text)
    fichier_joint: Mapped[Optional[str]] = mapped_column(String(255))
    periode_debut: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    periode_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_membre: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.membre.id', ondelete='SET NULL'))

    # Relations
    membre: Mapped[Optional['Membre']] = relationship('Membre', back_populates='rapports')


class Liste(Base):
    __tablename__ = 'liste'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='liste_pkey'),
        Index('idx_liste_espace', 'id_espace'),
        Index('idx_liste_workspace', 'id_workspace'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    nom: Mapped[str] = mapped_column(String(150))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    id_espace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.espace.id', ondelete='SET NULL'))
    id_workspace: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.workspace.id', ondelete='SET NULL'))

    # Relations
    espace: Mapped[Optional['Espace']] = relationship('Espace', back_populates='listes')
    workspace: Mapped[Optional['Workspace']] = relationship('Workspace', back_populates='listes')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='liste')
    taches: Mapped[List['Tache']] = relationship('Tache', back_populates='liste')
    canevas: Mapped[Optional['Canevas']] = relationship('Canevas', back_populates='liste', uselist=False)


class AbsenceEtConge(Base):
    __tablename__ = 'absence_et_conge'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='absence_et_conge_pkey'),
        Index('idx_absence_et_conge_membre', 'id_membre'),
        Index('idx_absence_et_conge_statut', 'statut'),
        Index('idx_absence_et_conge_date_debut', 'date_debut'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    is_absence: Mapped[bool] = mapped_column(Boolean)
    date_debut: Mapped[datetime.datetime] = mapped_column(DateTime)
    date_fin: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    statut: Mapped[str] = mapped_column(String(50))
    statut_date: Mapped[datetime.datetime] = mapped_column(DateTime)
    motif: Mapped[Optional[str]] = mapped_column(String(255))
    is_conge_planifie: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    duree_demandee_en_jours: Mapped[Optional[int]] = mapped_column(Integer)
    id_membre: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.membre.id', ondelete='SET NULL'))
    
    # Relations
    membre: Mapped[Optional['Membre']] = relationship('Membre', back_populates='absences_et_conges')


class Tache(Base):
    __tablename__ = 'tache'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tache_pkey'),
        Index('idx_tache_liste', 'id_liste'),
        Index('idx_tache_statut', 'statut'),
        Index('idx_tache_priorite', 'priorite'),
        Index('idx_tache_date_fin_prevue', 'date_fin_prevue'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    date_debut: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    date_fin_prevue: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    statut: Mapped[str] = mapped_column(String(50))
    statut_date: Mapped[datetime.datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    priorite: Mapped[Optional[str]] = mapped_column(String(50))
    ordre_affichage: Mapped[Optional[int]] = mapped_column(SmallInteger)
    id_liste: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.liste.id', ondelete='SET NULL'))
    
    # Relations
    liste: Mapped[Optional['Liste']] = relationship('Liste', back_populates='taches')
    membres: Mapped[List['Membre']] = relationship('Membre', back_populates='tache')
    checklists: Mapped[List['Checklist']] = relationship('Checklist', back_populates='tache')


class Canevas(Base):
    __tablename__ = 'canevas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='canevas_pkey'),
        UniqueConstraint('id_liste', name='canevas_id_liste_key'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    is_verrouille: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_liste: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.liste.id', ondelete='CASCADE'), unique=True)
    
    # Relations
    liste: Mapped[Optional['Liste']] = relationship('Liste', back_populates='canevas')
    sections: Mapped[List['Section']] = relationship('Section', back_populates='canevas')


class Section(Base):
    __tablename__ = 'section'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='section_pkey'),
        Index('idx_section_canevas', 'id_canevas'),
        Index('idx_section_titre', 'titre'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    titre: Mapped[str] = mapped_column(String(150))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_canevas: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.canevas.id', ondelete='CASCADE'))

    # Relations
    canevas: Mapped[Optional['Canevas']] = relationship('Canevas', back_populates='sections')
    checklists: Mapped[List['Checklist']] = relationship('Checklist', back_populates='section')


class Checklist(Base):
    __tablename__ = 'checklist'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='checklist_pkey'),
        Index('idx_checklist_section', 'id_section'),
        Index('idx_checklist_tache', 'id_tache'),
        Index('idx_checklist_is_checked', 'is_checked'),
        {'schema': 'planer'}
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    texte: Mapped[str] = mapped_column(String(255))
    is_checked: Mapped[bool] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    id_section: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.section.id', ondelete='CASCADE'))
    id_tache: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('planer.tache.id', ondelete='CASCADE'))
    
    # Relations
    section: Mapped[Optional['Section']] = relationship('Section', back_populates='checklists')
    tache: Mapped[Optional['Tache']] = relationship('Tache', back_populates='checklists')
