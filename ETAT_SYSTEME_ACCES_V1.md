# État du Système d'Accès K-Planner — V1 Actuelle
## Document Technique Frontend-Backend

**Date** : 8 mai 2026  
**Auteur** : Équipe Frontend  
**Destinataire** : Équipe Backend  
**Objectif** : Cartographier l'existant, aligner le frontend, et planifier les améliorations

---

## 1. Architecture de Base — Validée & Bien Implémentée ✅

### 1.1 Table Centrale `planer.membre`
Le backend a correctement modélisé la gestion des accès via une **table pivot unique** :

```sql
CREATE TABLE planer.membre (
    id VARCHAR(12) PRIMARY KEY,
    id_utilisateur VARCHAR(12) REFERENCES public.utilisateur(id),
    id_workspace VARCHAR(12) REFERENCES planer.workspace(id),
    id_espace VARCHAR(12) REFERENCES planer.espace(id),
    id_liste VARCHAR(12) REFERENCES planer.liste(id),
    id_tache VARCHAR(12) REFERENCES planer.tache(id),
    role VARCHAR(30),
    statut VARCHAR(30),
    CONSTRAINT membre_cible_unique_check 
        CHECK (num_nonnulls(id_workspace, id_espace, id_liste, id_tache) = 1)
);
```

**Points Forts** :
- ✅ Contrainte SQL vérifie qu'une ligne ne cible qu'UNE ressource
- ✅ Gestion des 4 statuts : `Actif`, `En attente`, `Suspendu`, `Quitté`
- ✅ Gestion des 4 rôles : `Créateur`, `Administrateur`, `Membre`, `Invité`

### 1.2 Modèles SQLAlchemy
Le backend a aussi bien mappé les relations `Membre` dans [api_workspace/models.py](models.py) :

```python
class Membre(Base):
    id_utilisateur: Mapped[Optional[str]]
    id_workspace: Mapped[Optional[str]]
    id_espace: Mapped[Optional[str]]
    id_liste: Mapped[Optional[str]]
    id_tache: Mapped[Optional[str]]
    role: Mapped[str]
    statut: Mapped[str]
    
    # Relations chargées
    utilisateur: relationship('Utilisateur')
    workspace: relationship('Workspace')
    espace: relationship('Espace')
    liste: relationship('Liste')
    tache: relationship('Tache')
```

**Points Forts** :
- ✅ Eager loading via `joinedload()` pour éviter N+1 queries
- ✅ Relations bidirectionnelles correctes

---

## 2. Fonctionnalités Implémentées — État Actuel

### 2.1 Gestion des Workspaces
| Endpoint | Méthode | Status | Notes |
|----------|---------|--------|-------|
| `/workspaces/create_workspace` | POST | ✅ IMPL | Créateur auto-défini, workspace personnel créé |
| `/workspaces/{id}/get_workspace_detail` | GET | ✅ IMPL | Retourne contexte utilisateur + rôle |
| `/workspaces/{id}/update_workspace` | PUT | ✅ IMPL | Réservé au Créateur |
| `/workspaces/{id}/delete_workspace` | DELETE | ✅ IMPL | Réservé au Créateur + cascade |
| `/workspaces/my_navigation` | GET | ✅ IMPL | Vue GLOBALE avec hiérarchie complète |
| `/workspaces/my_access` | GET | ✅ IMPL | Listing workspaces (Possédés vs Rejoints) |
| `/workspaces/{id}/local_resources` | GET | ✅ IMPL | Vue contextualisée d'un workspace |

### 2.2 Gestion des Invitations
| Endpoint | Méthode | Status | Notes |
|----------|---------|--------|-------|
| `/workspaces/{id}/invite_member_workspace` | POST | ✅ IMPL | Utilisateur existant + Guest support |
| `/workspaces/invitations/accept` | POST | ✅ IMPL | Accept via token (authentifié) |
| `/workspaces/invitations/accept-from-email` | GET | ✅ IMPL | Accept via lien email (non-authentifié) |
| `/invitations/list_pending_invitations` | GET | ✅ IMPL | Invite en attente |
| `/invitations/cancel_invitation` | DELETE | ✅ IMPL | Annuler une invitation |

**Logique Implémentée** :
- ✅ Token JWT avec expiration (7j utilisateur existant, 4j guest)
- ✅ Deux types d'invitations :
  - **Utilisateur existant** : crée `Membre` en `En attente` + token avec `sub`
  - **Invité externe** : token avec `email` seulement
- ✅ Vérification sécurité : token email doit matcher email utilisateur

### 2.3 Gestion des Rôles & Permissions
**Contrôles d'Accès Implémentés** :

```python
# Dans core/function.py
class Role:
    CREATOR = "Créateur"
    ADMIN = "Administrateur"
    MEMBER = "Membre"
    GUEST = "Invité"
    
    MANAGEMENT_ROLES = {CREATOR, ADMIN}
    ADMIN_MANAGEABLE_ROLES = {MEMBER, GUEST}
    READ_ROLES = {CREATOR, ADMIN, MEMBER, GUEST}

# Enforcement via fonctions
_require_workspace_read_access()       # Lecture (tous les rôles)
_require_workspace_management_access() # Management (Créateur + Admin)
_require_workspace_owner_access()      # Propriétaire uniquement
_require_workspace_member_management_access() # Gestion des membres
_require_workspace_invitation_access() # Vérif permissions invitation
```

**Restrictions Implémentées** :
- ✅ Admin ne peut pas modifier/retirer Créateur
- ✅ Admin ne peut inviter que Membre/Invité
- ✅ Créateur seul peut supprimer workspace
- ✅ Créateur seul peut modifier workspace

### 2.4 Gestion des Membres
| Endpoint | Méthode | Status | Notes |
|----------|---------|--------|-------|
| `/workspaces/{id}/list_workspace_members` | GET | ✅ IMPL | Liste tous les membres + eager load |
| `/workspaces/{id}/members/{uid}/update_workspace_member` | PUT | ✅ IMPL | Modifier rôle/statut (avec permission check) |
| `/workspaces/{id}/members/{uid}/remove_workspace_member` | DELETE | ✅ IMPL | Retirer membre (avec permission check) |
| `/workspaces/{id}/leave_workspace` | POST | ✅ IMPL | Quitter workspace (non-propriétaire) |

**Points Forts** :
- ✅ Suppression en cascade des dépendances (Fichier, Rapport, Absence, etc.)
- ✅ Propriétaire ne peut pas quitter
- ✅ Permission-aware pour chaque opération

---

## 3. Ce Que Frontend Doit Adapter — V1

### 3.1 Rôles par Défaut
**État Actuel** : Lors d'une invitation, le default est `"Membre"`

```python
# Dans schemas.py, routes
role: str = Field(default="Membre")
```

**Plan à Long Terme** : Changer à `"Invité"` (lecture seule)  
**Action Frontend** :
- ✅ Toujours spécifier le rôle explicitement en invitation (ne pas compter sur le default)
- ✅ Afficher dans l'UI : *"Par défaut, les invités en lecture seule"*

### 3.2 Accès Contextuel
**État Actuel** : Le backend retourne les infos de navigation complètes via `/my_navigation`  
**Action Frontend** :
- ✅ Utiliser ce endpoint pour afficher le chemin hiérarchique (Workspace → Espace → Liste → Tâche)
- ✅ Afficher les données minimales des parents pour non-manageurs

### 3.3 Statuts d'Invitation
**État Actuel** : `En attente` créé à l'invitation, `Actif` à l'acceptation  
**Action Frontend** :
- ✅ Afficher dans "Mon Profil" : invitations en attente (via `/invitations/list_pending_invitations`)
- ✅ Bouton "Accepter" qui appelle `/workspaces/invitations/accept`

---

## 4. Points d'Amélioration Futurs — Préservant le Travail Existant

### 4.1 Héritage Descendant (Priorité 1)
**État Actuel** : Non implémenté  
**Besoin** : Admin d'espace hériterait accès aux listes/tâches de cet espace  
**Plan** :
- Créer fonction `_get_effective_access_with_inheritance()`
- Modifier les fonctions de permission pour vérifier parents récursivement
- **Ne supprime pas** ce qui existe, ajoute juste des requêtes supplémentaires

### 4.2 Automatisation d'Assignation (Priorité 2)
**État Actuel** : Assignation de tâche directe  
**Besoin** : Créer automatiquement accès à liste quand tâche assignée  
**Plan** :
- Dans `crud/tache.py`, lors d'assignation : créer deux entrées `Membre` (liste + tâche)
- Promouvoir à "Membre" si statut `En attente`
- **Impacte** : Création de tâche seulement

### 4.3 Gestion Premium (En cours)
**État Actuel** : Existe dans modèles (user `type_compte`, dates expiration)  
**Besoin** : Limiter workspaces/membres pour comptes gratuits  
**Plan** :
- Utiliser fonction `is_premium_user()` existante
- Ajouter limite dans routes de création

---

## 5. Feuille de Route Frontend — En Accord Avec Backend

### Phase 1 - Immédiat ✅
**Adapter UI pour fonctionnalités existantes** :
- [ ] Page "Mes Workspaces" avec listing posse/rejoints
- [ ] Formulaire invitation workspace (liste existants & guests)
- [ ] Page invitations en attente
- [ ] Détail workspace + liste membres
- [ ] Modifier rôle/statut member

### Phase 2 - Court Terme (+2 semaines)
**Valider avec backend** :
- [ ] Clarifier default rôle (reste `Membre` pour V1, change à `Invité` après)
- [ ] Documenter accès contextuel (quoi afficher à qui)
- [ ] Clarifier creation automatique membres sur assignation tâche

### Phase 3 - Moyen Terme (+1 mois)
**Backend étend héritage** :
- [ ] Backlog : Héritage descendant Créateur/Admin
- [ ] Backlog : Automatisations assignation tâche

### Phase 4 - Long Terme
**Gestion Premium & Optimisations** :
- [ ] Limiting rules par compte type
- [ ] Notifications assignation

---

## 6. Points de Clarification — À Valider Ensemble

| Question | État | Action |
|----------|------|--------|
| L'accès à un workspace parent par admin espace = contexte seulement ? | ✅ CLAIR | Frontend affichera nom/description uniquement |
| Default role invitation reste Membre pour V1 ? | 📋 À CONFIRMER | Backend confirme ou change maintenant |
| Création auto-membres lors assignation tâche + liste ? | 📋 À CONFIRMER | Backend planifie cette feature |
| Promotion auto à Membre si tâche assignée + déjà Invité ? | 📋 À CONFIRMER | Backend inclut logique |

---

## 7. Ressources & Références

- **Modèles** : `backend/api_workspace/models.py`
- **CRUD** : `backend/api_workspace/crud/utilisateur.py`
- **Contrôles Accès** : `backend/api_workspace/core/function.py`
- **Routes** : `backend/api_workspace/routes/utilisateur.py`, `admin.py`, `entreprise.py`
- **Schémas** : `backend/api_workspace/schemas.py`

---

## 8. Résumé Exécutif

| Aspect | Status | Score |
|--------|--------|-------|
| Architecture de base (table membre, rôles, statuts) | ✅ | 10/10 |
| Gestion invitations & tokens | ✅ | 9/10 |
| Contrôles d'accès directs | ✅ | 9/10 |
| Héritage descendant | ❌ | 0/10 (futur) |
| Accès contextuel explicite | ⚠️ | 5/10 (via navigation) |
| Automatisations | ⚠️ | 3/10 (assignation tâche) |
| **TOTAL** | ✅ | **7/10** |

**Conclusion** : Le backend a un **socle solide** pour la gestion d'accès. Le frontend doit l'adopter et proposer les extensions de manière collaborative.

