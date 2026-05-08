# Guide d'Intégration Frontend — Gestion des Accès K-Planner
## À Adapter au Backend Existant

**Date** : 8 mai 2026  
**Version** : 1.0  
**Pour** : Respecter le travail backend et construire dessus

---

## 1. Endpoints à Intégrer — Priorité Immédiate

### 1.1 Navigation Globale
**Endpoint** : `GET /workspaces/my_navigation`

**Retour** : Hiérarchie complète de l'utilisateur

```json
{
  "workspaces_owned": [
    {
      "id": "ws1",
      "nom": "Mon Startup",
      "espaces": [
        {
          "id": "e1",
          "nom": "Développement",
          "listes": [...],
          "sous_espaces": [...]
        }
      ]
    }
  ],
  "workspaces_joined": [
    {
      "id": "ws2",
      "nom": "Projet Client",
      "current_user_role": "Invité",
      "member_count": 5
    }
  ]
}
```

**Utilisation Frontend** :
- Sidebar navigation : afficher workspaces + espaces accessibles
- Breadcrumb : construire chemin hiérarchique
- Dashboard : compter ressources par utilisateur

---

### 1.2 Listing Mes Accès
**Endpoint** : `GET /workspaces/my_access`

**Retour** : Segmentation workspaces possédés vs rejoints

```json
{
  "owned": {
    "count": 3,
    "items": [...]
  },
  "joined": {
    "count": 2,
    "items": [...]
  }
}
```

**Utilisation Frontend** :
- Page "Mes Workspaces" : deux sections (Possédés / Rejoints)
- Afficher rôle, statut, member_count
- Boutons différents selon rôle (Créateur → gestion, Admin → gestion limitée, Invité → lecture)

---

### 1.3 Ressources Locales d'un Workspace
**Endpoint** : `GET /workspaces/{workspace_id}/local_resources`

**Retour** : Données contextualisées du workspace

```json
{
  "workspace": {
    "id": "ws1",
    "nom": "...",
    "description": "...",
    "current_user_role": "Créateur"
  },
  "espaces": [...],
  "membres": [
    {
      "id": "m1",
      "id_utilisateur": "...",
      "utilisateur": {
        "id": "u1",
        "username": "alice",
        "email": "alice@..."
      },
      "role": "Administrateur",
      "statut": "Actif"
    }
  ]
}
```

**Utilisation Frontend** :
- Détail d'un workspace : afficher espaces + membres
- Filtrer membres selon role utilisateur (Créateur voit tous, Invité voit peu)
- Masquer actions selon rôle (Admin ne voit pas "supprimer workspace")

---

## 2. Invitations — Flux Complet

### 2.1 Inviter Quelqu'un
**Endpoint** : `POST /workspaces/{workspace_id}/invite_member_workspace`

**Body** :
```json
{
  "email": "bob@example.com",
  "username": null,
  "role": "Invité"
}
```

**Retour** - Cas 1 (Utilisateur existant) :
```json
{
  "status": "existing_user",
  "message": "Invitation envoyée à l'utilisateur existant.",
  "email": "bob@example.com",
  "membre": {
    "id": "m2",
    "role": "Invité",
    "statut": "En attente"
  }
}
```

**Retour** - Cas 2 (Guest/Nouvelle inscription) :
```json
{
  "status": "guest_invitation",
  "message": "Invitation envoyée par lien (utilisateur non inscrit).",
  "email": "bob@example.com",
  "token": "eyJhbGc..."
}
```

**Utilisation Frontend** :
- Afficher formulaire : email ou username
- Dropdown rôle : limiter à `{Invité, Membre}` si Admin, afficher `{Invité, Membre, Administrateur}` si Créateur
- Afficher message success différent selon cas
- Cas Guest : montrer bouton "Copier lien d'invitation"

### 2.2 Lister Invitations en Attente
**Endpoint** : `GET /invitations/list_pending_invitations`

**Retour** :
```json
[
  {
    "id": "m2",
    "id_utilisateur": "u2",
    "utilisateur": {...},
    "id_workspace": "ws1",
    "role": "Invité",
    "statut": "En attente",
    "created_at": "2026-05-08T10:00:00"
  }
]
```

**Utilisation Frontend** :
- Page "Invitations en attente" (après login)
- Afficher : workspace + rôle + date
- Bouton : "Accepter" + "Refuser"

### 2.3 Accepter Invitation (Authentifié)
**Endpoint** : `POST /workspaces/invitations/accept`

**Body** :
```json
{
  "token": "eyJhbGc..."
}
```

**Retour** :
```json
{
  "id": "m2",
  "role": "Invité",
  "statut": "Actif"
}
```

**Utilisation Frontend** :
- Bouton "Accepter" dans liste invitations en attente
- Rafraîchir espace de travail après

### 2.4 Accepter Invitation (Lien Email - Non-Authentifié)
**Endpoint** : `GET /workspaces/invitations/accept-from-email?token=eyJhbGc...`

**Retour** : Page HTML avec succès/erreur

**Utilisation Frontend** :
- Lien d'email cliquable
- Backend retourne HTML (pas de redirection frontend nécessaire)
- Si utilisateur déjà connecté : proposer lien automatique

### 2.5 Annuler Invitation (Admin/Créateur)
**Endpoint** : `DELETE /workspaces/{workspace_id}/invitations/{user_id}`

**Utilisation Frontend** :
- Page "Gestion Membres" → action "Retirer" sur invitations en attente
- Bouton visible seulement si Créateur/Admin

---

## 3. Gestion des Membres

### 3.1 Lister Membres d'un Workspace
**Endpoint** : `GET /workspaces/{workspace_id}/list_workspace_members`

**Retour** :
```json
[
  {
    "id": "m1",
    "id_utilisateur": "u1",
    "utilisateur": {
      "id": "u1",
      "username": "alice",
      "email": "alice@...",
      "nom": "Alice",
      "prenoms": "..."
    },
    "role": "Créateur",
    "statut": "Actif"
  },
  {
    "id": "m2",
    "role": "Invité",
    "statut": "En attente"
  }
]
```

**Utilisation Frontend** :
- Tab "Membres" dans détail workspace
- Afficher avatar + username + rôle + statut
- Trier : Créateur → Admin → Membre → Invité
- Icônes visuelles : ✅ Actif, ⏳ En attente, 🚫 Suspendu, 👋 Quitté

### 3.2 Modifier Rôle/Statut d'un Membre
**Endpoint** : `PUT /workspaces/{workspace_id}/members/{user_id}`

**Body** :
```json
{
  "role": "Administrateur",
  "statut": "Actif"
}
```

**Utilisation Frontend** :
- Icône edit sur chaque ligne membre
- Dropdown rôle : `{Invité, Membre, Administrateur}` (selon rôle acteur)
- Statut : `{Actif, En attente, Suspendu, Quitté}`
- Validation : Admin ne peut modifier que Invité/Membre
- Avertissement : "Attention, cette action ne peut pas être annulée"

### 3.3 Retirer un Membre
**Endpoint** : `DELETE /workspaces/{workspace_id}/members/{user_id}`

**Utilisation Frontend** :
- Bouton "Retirer" sur ligne membre
- Modal confirmation : "Retirer bob du workspace ? Ses données seront supprimées."
- Afficher restrictions : créateur ne peut pas être retiré

### 3.4 Quitter un Workspace
**Endpoint** : `POST /workspaces/{workspace_id}/leave_workspace`

**Utilisation Frontend** :
- Menu utilisateur > "Quitter ce workspace"
- Modal "Êtes-vous sûr(e) ?"
- Redirection vers "Mes Workspaces" après
- **Restrictions** : Créateur ne peut pas quitter

---

## 4. Contrôle d'Accès — Logique Frontend

### 4.1 Rôles et Permissions
| Rôle | Lecture | Modifier Workspace | Inviter | Gérer Membres | Supprimer |
|------|---------|-------------------|---------|---------------|-----------|
| Créateur | ✅ | ✅ | ✅ | ✅ | ✅ |
| Administrateur | ✅ | ❌ | ✅ | ⚠️ (Invité/Membre) | ❌ |
| Membre | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invité | ✅ | ❌ | ❌ | ❌ | ❌ |

### 4.2 Logique de Masquage UI
```javascript
// Pseudo-code
function showAction(action, currentUserRole) {
  const permissions = {
    "delete_workspace": ["Créateur"],
    "update_workspace": ["Créateur"],
    "invite_member": ["Créateur", "Administrateur"],
    "remove_member": ["Créateur", "Administrateur"],
    "manage_member_role": ["Créateur"],
    // Admin ne peut modifier que Invité/Membre (backend enforce)
  };
  
  return permissions[action]?.includes(currentUserRole) || false;
}

// Utilisation
{showAction("invite_member", workspace.current_user_role) && <Button>Inviter</Button>}
```

### 4.3 Statuts & Affichage
```javascript
const statusBadges = {
  "Actif": "🟢 Actif",
  "En attente": "🟡 En attente (acceptation requise)",
  "Suspendu": "🔴 Suspendu",
  "Quitté": "⚪ Parti"
};
```

---

## 5. Accès Contextuel — Navigation Hiérarchique

### 5.1 Afficher Chemin Complet
**Exemple** : Si utilisateur sur Tâche T1

```
Workspace "Mon Startup"
  └── Espace "Développement"
      └── Liste "Backend"
          └── Tâche "Implémenter API"
```

**Utilisation Frontend** :
- Breadcrumb cliquable : `Workspace > Espace > Liste > Tâche`
- Chaque lien mène à la ressource (sauf si pas d'accès direct : alors afficher texte seulement)

### 5.2 Données Minimales des Parents
**Si utilisateur est Invité d'un Workspace** :
- ✅ Voir : id, nom, description du workspace
- ❌ Voir : liste membres, paramètres, statistiques

**Implémentation** :
- Endpoint `/local_resources` filtre les données selon rôle
- Frontend affiche que ce qui est retourné

---

## 6. Statut Spécial — "En attente"

### 6.1 Situations
- Invitation envoyée, pas encore acceptée
- Membre suspendu puis réactivé
- Nouveau member pas encore actif

### 6.2 Affichage UI
```
Invitation en attente (Pas de super-permissions)
🟡 En attente depuis 2 jours
Actions : Accepter | Refuser | Renvoyer lien
```

### 6.3 Pas d'Accès
Un membre en `"En attente"` ne peut PAS :
- Accéder au workspace
- Voir données privées
- S'identifier avec ses permissions

**Backend enforces** : via `Statut.ACTIVE` checks dans les requêtes

---

## 7. Validation Côté Frontend

### 7.1 Avant Envoyer Invitation
```javascript
function validateInvitation(data) {
  const { email, username, role } = data;
  
  // Email OU username
  if (!email && !username) {
    return "Fournissez email ou username";
  }
  if (email && username) {
    return "Choisissez email OU username";
  }
  
  // Rôle valide
  if (!["Invité", "Membre", "Administrateur"].includes(role)) {
    return "Rôle invalide";
  }
  
  // Admin ne peut inviter que Invité/Membre
  if (currentUserRole === "Administrateur" && role === "Administrateur") {
    return "Vous ne pouvez pas inviter un autre Admin";
  }
  
  return null; // OK
}
```

### 7.2 Avant Modifier Membre
```javascript
function validateMemberUpdate(data, currentUserRole) {
  const { role, statut } = data;
  
  // Admin peut modifier seulement Invité/Membre
  if (currentUserRole === "Administrateur") {
    if (!["Invité", "Membre"].includes(role)) {
      return "Vous ne pouvez modifier que les rôles Invité/Membre";
    }
  }
  
  return null; // OK
}
```

---

## 8. Messages d'Erreur Cohérents

| Situation | Message |
|-----------|---------|
| Pas accès workspace | "Vous n'avez pas accès à ce workspace." |
| Déjà membre actif | "Cet utilisateur est déjà membre de ce workspace." |
| Invitation expiré | "Ce lien d'invitation a expiré. Demandez une nouvelle invitation." |
| Email non reconnu | "Cet email n'est pas celui invité." |
| Fournir email/username | "Veuillez fournir l'email ou le username de l'utilisateur à inviter." |
| Pas permission | "Seul le créateur du workspace peut effectuer cette action." |
| Créateur fixe | "Le créateur du workspace ne peut pas être modifié ou retiré." |

---

## 9. Checklist d'Intégration

### Phase 0 - Préparation
- [ ] Lire `ETAT_SYSTEME_ACCES_V1.md`
- [ ] Comprendre rôles : Créateur > Admin > Membre > Invité
- [ ] Noter statuts : Actif, En attente, Suspendu, Quitté

### Phase 1 - Endpoints Basiques
- [ ] Intégrer `GET /workspaces/my_navigation`
- [ ] Intégrer `GET /workspaces/my_access`
- [ ] Afficher listing workspaces (Possédés vs Rejoints)

### Phase 2 - Invitations
- [ ] POST invite + affichage message success/dupliquée
- [ ] GET list pending invitations
- [ ] POST accept invitation
- [ ] Page lien email non-auth

### Phase 3 - Gestion Membres
- [ ] GET list members + affichage
- [ ] PUT modifier role/statut + validations
- [ ] DELETE remove member
- [ ] POST leave workspace + restrictions

### Phase 4 - Accès & Permissions
- [ ] Masquer actions selon role (delete seulement Créateur, etc.)
- [ ] Valider formulaires avant envoi
- [ ] Afficher breadcrumb hiérarchique
- [ ] Gérer état "En attente" visuellement

### Phase 5 - Test & Refinement
- [ ] Tester flux invitation utilisateur existant
- [ ] Tester flux invitation guest
- [ ] Tester permission escalation (Admin ne peut pas promouvoir à Admin)
- [ ] Tester acceptation via email

---

## 10. Stack Frontend Recommandé

- **State Management** : Zustand / Redux pour stocker `current_workspace`, `current_user_role`
- **Forms** : React Hook Form + Zod (validation schemas)
- **UI Feedback** : Toast notifications (Sonner / React Toastify)
- **Tables** : TanStack Table pour membres listing
- **Modals** : Confirmation dialogs cohérentes

---

## 11. Points de Contact Backend

| Besoin | Contact |
|--------|---------|
| Feature demandée pas fonctionnelle | Ouvrir issue avec endpoint testé en Postman |
| Default rôle changement | Demander confirmation avant changer en production |
| Nouvelle restriction permission | Faire test d'intégration end-to-end |
| Performance requête heavy | Proposer cache/pagination côté frontend |

---

**Fin du guide. Bon codage ! 🚀**

