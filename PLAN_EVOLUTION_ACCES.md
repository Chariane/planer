# Plan d'Évolution du Système d'Accès — Roadmap Commune
## Du V1 Actuel au Système Complet

**À** : Dev Backend  
**De** : Équipe Frontend  
**Objectif** : Proposer améliorations sans remettre en question le travail actuel  
**Philosophie** : Ajouter, pas remplacer

---

## Contexte

Le backend a construit un **socle solide** pour la gestion d'accès. La table `memberé`, les rôles, les statuts — tout ça fonctionne bien.

On propose d'évoluer **progressivement** en 4 phases, chacune validée et testée avant la suivante.

---

## Phase 1 : V1 Actuelle (Maintenant)

### Ce Qui Fonctionne
✅ Invitations (utilisateur existant + guest)  
✅ Gestion des rôles au niveau workspace  
✅ Contrôles d'accès directs  
✅ Quitter/Retirer members  

### Frontend Action
- Adapter UI aux endpoints existants
- Valider permissions client-side (backend enforces serveur)
- Afficher navigation hiérarchique via `/my_navigation`

### Timeframe
**Maintenant → +2 semaines**

**Critère de Succès**
- Frontend affiche workspaces + invite + gère members
- Tous endpoints fonctionnels & testés

---

## Phase 2 : Clarification (Court Terme, +2-3 semaines)

### Points à Valider Ensemble

#### 2.1 Format Rôle par Défaut
**Question** : Garder "Membre" ou changer à "Invité" ?

```
Actuellement : role: str = Field(default="Membre")
Proposition : role: str = Field(default="Invité")  # Plus logique (read-only)
```

**Décision** :
- [ ] Garder "Membre" (accepter default actuel)
- [ ] Changer à "Invité" (plus cohérent avec le plan)

**Backend Action** : Si changement, update dans `schemas.py` + `models.py`  
**Frontend Action** : Toujours spécifier rôle explicitement (ne compter sur aucun default)

---

#### 2.2 Accès Contextuel — Filtre de Données
**Besoin** : Un invité ne doit voir QUE les données de sa ressource, pas les stats/paramétrages.

**Exemple** :
```python
# GET /workspaces/{id}/local_resources?include=minimal
# Retourne MOINS de données si role = "Invité"

# Si Créateur/Admin :
{
  "workspace": {...full...},
  "members": [...all...],
  "stats": {...},
  "settings": {...}
}

# Si Invité :
{
  "workspace": {id, nom, description},      # Minimal
  "members": []  # Pas de liste complète
}
```

**Backend Action** : Ajouter paramètre `include=full|minimal` ou filtrer auto par rôle  
**Frontend Action** : Adapter l'affichage selon ce qui est retourné

---

#### 2.3 Assignation Tâche = Création Auto Membre
**Besoin** : Quand on assigne une tâche à quelqu'un, lui créer automatiquement accès à la liste.

**Cas d'Usage** :
```
Manager assigne tâche T1 à Paul
→ Crée automatiquement :
   - Membre(id_tache=T1, id_utilisateur=Paul, role="Membre")
   - Membre(id_liste=L1, id_utilisateur=Paul, role="Membre")  [si absent]

Paul peut voir L1 + T1 sans invitation séparée
```

**Backend Action** : 
- Dans `crud/tache.py`, fonction `assign_task()` :
  - Créer entrée Membre(id_tache)
  - Vérifier si Membre(id_liste) existe, créer si absent

**Frontend Action** : 
- Lors assignation : appeler endpoint backend
- Valider permission assignateur (Créateur/Admin)

---

#### 2.4 Promotion Auto à "Membre"
**Besoin** : Si un utilisateur est Invité d'un workspace, mais on l'assigne à une tâche de ce workspace, le promouvoir à "Membre".

**Logique** :
```
Statut avant : Invite de Workspace W1
Statut après assignation tâche : Membre de Workspace W1

Role reste "Invité" sur W1, mais statut change pour signaler "engagement"
```

**Backend Action** :
- Dans processus assignation : déterminer rôle effectif
- Promouvoir si conditions
- Ou simplement promouvoir "Invité" → "Membre" auto au 1er accès enfant

**Frontend Action** : 
- Afficher distinction visuelle Invité vs Membre

---

## Phase 3 : Héritage Descendant (Moyen Terme, +1 mois)

### Vue d'Ensemble
Un Admin d'espace a accès à toutes les listes/tâches de cet espace, sans invitation séparée.

### Implémentation Backend

**Fonction Nouvelle** :
```python
def _get_effective_access_with_inheritance(db: Session, user_id: str, resource_id: str, resource_type: str):
    """
    Vérifie accès en trois niveaux :
    1. Accès direct via Membre
    2. Accès via héritage (parent est Créateur/Admin)
    3. Accès contextuel (parent est Invité/Membre)
    """
    
    # 1. Accès direct
    direct_access = find_direct_member(user_id, resource_id)
    if direct_access:
        return direct_access.role, "DIRECT"
    
    # 2.Héritage
    parent_access = find_parent_admin_access(user_id, resource_id, resource_type)
    if parent_access:
        return "inherited_" + parent_access.role, "INHERITED"
    
    # 3. Contexte
    contextual_access = find_contextual_route(user_id, resource_id, resource_type)
    if contextual_access:
        return "contextual", "CONTEXTUAL"
    
    return None, None
```

**Modification des Vérifications** :
```python
# Avant
def _require_workspace_read_access(db, workspace_id, user_id):
    membre = get_workspace_member(db, workspace_id, user_id)
    if not membre or not is_active(membre):
        raise Forbidden()

# Après
def _require_workspace_read_access(db, workspace_id, user_id):
    direct_member = get_workspace_member(db, workspace_id, user_id)
    if direct_member and is_active(direct_member):
        return direct_member.role
    
    # Vérifier si créateur/admin d'un espace enfant
    inherited = check_inherited_access_from_espaces(db, workspace_id, user_id)
    if inherited:
        return "inherited_admin"  # Accès complet aux données
    
    raise Forbidden()
```

**Points Importants** :
- ✅ Admin d'espace → accès complet espace + enfants
- ✅ Ne change PAS l'accès au parent (workspace) — reste contextuel
- ✅ Performance : utiliser CTE (Common Table Expressions) ou cache

### Frontend Impact
- ✅ Aucun changement UI majeur
- ✅ Juste que les endpoints retournent plus de données
- ✅ Afficher tous les espaces/listes accessibles

---

## Phase 4 : Optimisations & Features Avancées (Long Terme)

### 4.1 Notifications
```
Quand Paul est assigné à tâche → notification
```

**Backend** : Émettre événement D'assignation  
**Frontend** : Afficher toast/badge

### 4.2 Gestion Premium
```
Compte gratuit : max 3 workspaces, 10 members
Compte Premium : illimité
```

**Backend** : Utiliser `is_premium_user()` existante + limiter dalam queries  
**Frontend** : Afficher limite/upgrade prompt

### 4.3 Audit & Logs
```
Chaque changement rôle/statut enregistré
```

**Backend** : Table `audit_log`  
**Frontend** : Page "Historique" (read-only)

---

## Tableau Récapitulatif

| Phase | Timeframe | Priorité | Notes |
|-------|-----------|----------|-------|
| **1. V1 Actuelle** | Now | 🔴 IMMÉDIATE | Frontend s'adapte à existant |
| **2. Clarifications** | +2-3w | 🟠 URGENT | Valider 4 points clés |
| **2a. Default Rôle** | +2-3w | 🟡 | Décider "Invité" vs "Membre" |
| **2b. Accès Contextuel** | +2-3w | 🟡 | Filtrer données par rôle |
| **2c. Auto-Membre Tâche** | +2-3w | 🟡 | Créer accès lors assignation |
| **2d. Promo Auto** | +2-3w | 🟡 | Invité → Membre auto |
| **3. Héritage Descendant** | +1m | 🟢 SOUHAITÉ | Étendre accès via parents |
| **4. Optimisations** | +2m+ | 🔵 FUTUR | Premium, logs, notifications |

---

## Comment Proposer Cela

### Réunion de Validation (Proposée)

```
Ordre du jour :
1. (5m) Présenter "État du Système V1" — montrer ce qui fonctionne
2. (10m) Discuter Phase 2 — 4 clarifications
3. (5m) Roadmap Phase 3-4 — long terme
4. (5m) Prioriser & planifier
```

### Documents à Partager
- ✅ `ETAT_SYSTEME_ACCES_V1.md` — Ce qu'on a
- ✅ `GUIDE_INTEGRATION_FRONTEND.md` — Comment frontend l'utilise
- ✅ Ce document — Où on va ensemble

---

## Points Clés à Retenir

1. **Respect du Travail Existant** — On n'efface rien, on ajoute.
2. **Validation Progressive** — Chaque phase testée avant la suivante.
3. **Clarifications Ensemble** — Phase 2 c'est une vraie discussion backend-frontend.
4. **Pas de Rush** — La roadmap est réaliste et étalée.

---

## Prochaine Étape

**Frontend**  
→ Implémenter V1 avec les endpoints existants (Phase 1)  
→ Proposer réunion pour Phase 2 clarifications

**Backend**  
→ Valider que Phase 1 endpoints sont stables  
→ Préparer input sur Phase 2 décisions

**Commun**  
→ Réunion de validation dans +1 semaine

---

**Signature**  
Équipe Frontend  
8 mai 2026

