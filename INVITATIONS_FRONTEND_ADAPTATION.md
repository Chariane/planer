# Adaptation Frontend — Invitations Backend existantes

## Objectif
Aligner le frontend sur le backend déjà implémenté pour la gestion des invitations workspace.

Ce document décrit :
- les endpoints disponibles
- les payloads attendus
- les réponses renvoyées
- les cas d'utilisation front
- les validations à faire côté UI

---

## 1. Endpoints d'invitation workspace

### 1.1 Inviter un utilisateur

**Endpoint** : `POST /workspaces/{workspace_id}/invite_member_workspace`

**Payload** :
```json
{
  "email": "bob@example.com",
  "username": null,
  "role": "Membre"
}
```

ou

```json
{
  "email": null,
  "username": "bob123",
  "role": "Invité"
}
```

**Règles backend** :
- `email` ou `username` obligatoire
- `id_liste` et `id_tache` ne sont pas pris en charge ici (et sont rejetés)
- `role` doit appartenir à `WORKSPACE_ASSIGNABLE_ROLES = {"Administrateur", "Membre", "Invité"}`
- rôle par défaut défini actuellement sur `Membre`

**Réponse cas utilisateur existant** :
```json
{
  "status": "existing_user",
  "message": "Invitation envoyee a l'utilisateur existant.",
  "email": "bob@example.com",
  "membre": {
    "id": "m123",
    "id_utilisateur": "u123",
    "role": "Membre",
    "statut": "En attente",
    "id_workspace": "ws123",
    "created_at": "2026-05-08T..."
  }
}
```

**Réponse cas invitation guest** :
```json
{
  "status": "guest_invitation",
  "message": "Invitation envoyee par lien (utilisateur non inscrit).",
  "email": "bob@example.com",
  "token": "eyJhbGc..."
}
```

**Front adapt** :
- Afficher message clairement différent selon `status`
- Si `guest_invitation`, montrer un bouton "Copier le lien d'invitation" ou "Envoyer le lien" si nécessaire
- Après succès, mettre à jour la liste des invitations en attente

---

### 1.2 Lister les invitations en attente

**Endpoint** : `GET /workspaces/invitations/list_pending_invitations`

**Réponse** :
```json
[
  {
    "id": "m123",
    "id_utilisateur": "u123",
    "role": "Invité",
    "statut": "En attente",
    "id_workspace": "ws1",
    "utilisateur": {
      "id": "u123",
      "username": "bob123",
      "email": "bob@example.com"
    }
  }
]
```

**Front adapt** :
- Page "Invitations reçues" ou modal "Invitations en attente"
- Afficher `username`/`email` si présent
- Bouton "Accepter" ou action dédiée de type page d'acceptation

---

### 1.3 Accepter une invitation (authentifié)

**Endpoint** : `POST /workspaces/invitations/accept`

**Payload** :
```json
{
  "token": "eyJhbGc..."
}
```

**Réponse** :
```json
{
  "id": "m123",
  "id_utilisateur": "u123",
  "role": "Membre",
  "statut": "Actif",
  "id_workspace": "ws1"
}
```

**Front adapt** :
- Endpoint utilisée après réception du token d'invitation dans le mail
- Pour le flow connecté, afficher un bouton "Accepter l'invitation"
- Après acceptation, rafraîchir le workspace / navigation

---

### 1.4 Accepter une invitation depuis le lien email (non-authentifié)

**Endpoint** : `GET /workspaces/invitations/accept-from-email?token=...`

**Comportement** :
- Backend rend une page HTML
- Si le lien est invalide/expiré, page d'erreur
- Si le lien est valide et déjà accepté, page de message

**Front adapt** :
- Ce flow n'est pas un endpoint JSON direct pour le frontend
- Tu peux simplement rediriger vers ce lien si tu envoies une invitation guest
- Ne pas tenter de parser JSON ici

---

### 1.5 Annuler une invitation en attente

**Endpoint** : `DELETE /workspaces/{workspace_id}/invitations/{user_id}/cancel_invitation`

**Comportement** :
- Vérification permission avec `_require_workspace_member_management_access`
- Supprime le membre en attente
- Retourne 204 si OK

**Front adapt** :
- Action disponible pour Créateur/Admin sur invitations `En attente`
- Confirmation modal nécessaire
- Après suppression, retirer de la liste

---

## 2. Autres actions liées qui impactent l’UI

### 2.1 Modifier rôle/statut d’un membre

**Endpoint** : `PUT /workspaces/{workspace_id}/members/{user_id}/update_workspace_member`

**Payload** :
```json
{
  "role": "Administrateur",
  "statut": "Actif"
}
```

**Règles backend** :
- Admin ne peut gérer que `Membre` et `Invité`
- Créateur peut modifier plus largement
- Validation de rôle/statut côté backend

**Front adapt** :
- Empêcher l’UI de proposer `Administrateur` si l'acteur est Admin
- Afficher message d'erreur si backend rejette
- Garder la valeur actuelle de rôle/statut quand on édite

### 2.2 Retirer un membre d’un workspace

**Endpoint** : `DELETE /workspaces/{workspace_id}/members/{user_id}/remove_workspace_member`

**Front adapt** :
- Bouton disponible pour Créateur/Admin
- Modal de confirmation
- Mettre à jour la liste de membres en succès

### 2.3 Quitter un workspace

**Endpoint** : `POST /workspaces/{workspace_id}/leave_workspace`

**Front adapt** :
- Afficher dans menu membre
- Bloquer pour créateur (backend renvoie 403)
- Rediriger hors du workspace après succès

---

## 3. Cas d'utilisation front à couvrir

### 3.1 Invitation d’un utilisateur existant

UI : Formulaire invitation workspace
- email ou username
- rôle
- bouton envoyer

CAS :
- backend crée `Membre` en `En attente`
- frontend affiche confirmation
- frontend rafraîchit liste des membres/invitations
- si `status = existing_user`, pas de lien de partage nécessaire

### 3.2 Invitation d’un guest (utilisateur non-inscrit)

UI : même formulaire
- seul `email` fonctionne vraiment dans le backend
- rôle possible `Invité|Membre|Administrateur`

CAS :
- backend renvoie `status = guest_invitation`
- frontend récupère `token`
- frontend propose de copier le lien ou l’envoyer
- le lien d’email est le seul moyen d’acceptation

### 3.3 Acceptation d’invitation par un utilisateur connecté

UI : on peut avoir un écran "Accepter une invitation"
- champ `token` si reçu manuellement
- ou bouton direct si token déjà dans l’URL

CAS :
- POST `/workspaces/invitations/accept`
- backend retourne un `WorkspaceMemberOut`
- frontend doit rediriger vers le workspace accepté

### 3.4 Listing invitations en attente

UI : tableau/invite cards
- email/username
- rôle
- statut `En attente`
- action `Annuler` pour admin

CAS :
- `GET /workspaces/invitations/list_pending_invitations`
- backend retourne memberships en attente uniquement
- frontend peut ouvrir détails

### 3.5 Modification de rôle/statut

UI : modal d’édition membre
- dropdown rôle
- dropdown statut

CAS :
- `PUT /workspaces/{workspace_id}/members/{user_id}/update_workspace_member`
- backend valide les droits et la valeur
- frontend actualise l’affichage

### 3.6 Suppression / départ

UI : bouton `Retirer` ou `Quitter`
- `Retirer` visible pour Créateur/Admin
- `Quitter` visible pour membre connecté

CAS :
- `DELETE /workspaces/{workspace_id}/members/{user_id}/remove_workspace_member`
- `POST /workspaces/{workspace_id}/leave_workspace`

---

## 4. Validations frontend recommandées

### 4.1 Avant envoi d’invitation
- `email || username` (obligatoire)
- ne pas accepter les deux vide
- vérifier format email si fourni
- éviter envoi si `role` vide
- optionnel : bloquer `Administrateur` pour un user si acteur est Admin

### 4.2 Avant mise à jour de membre
- `role` doit être dans `Administrateur, Membre, Invité`
- `statut` doit être dans `Actif, En attente, Suspendu, Quitté`
- si acteur = Admin, ne proposer que `Membre` ou `Invité`

### 4.3 Messages d’échec attendus
- `Pas de permissions` → afficher retour backend
- `Invitation déjà acceptée` → proposer rechargement
- `Email/token invalide` → retour erreur en rouge

---

## 5. Comportement à respecter pour ne pas casser le backend

1. Ne pas envoyer `id_liste` ou `id_tache` sur l’invitation workspace
2. Toujours inclure le `token` reçu pour acceptation guest
3. Pour l’invitation existante, accepter que le backend renvoie aussi une entité `membre`
4. Gérer la double acceptation (409) comme un cas non bloquant
5. Ne pas exposer d’UI pour invitation direct liste/tâche ici

---

## 6. Notes importantes

- Le backend actuel ne propose pas d’invitations directes sur liste/tâche via cet endpoint
- Le rôle par défaut est actuellement `Membre`, donc tu peux explicitement le passer dans le payload
- L’acceptation via lien email passe par une page HTML backend, pas via JSON

---

## 7. Prochaine étape frontend

- Implémenter les écrans d’invitation workspace
- Vérifier le comportement `guest_invitation`
- Afficher `invite_status` dans la liste des membres
- S’assurer que l’UI respecte les permissions Admin / Créateur

