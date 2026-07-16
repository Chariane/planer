from copy import deepcopy


PLAN_CATALOG = [
    {
        "code": "ESSENTIEL",
        "nom": "Essentiel",
        "audience": "Pour un utilisateur ou une petite equipe qui structure son travail.",
        "description": "Le socle gratuit pour demarrer avec K-Planner sans complexite.",
        "price_label": "0 XOF",
        "highlight": False,
        "billing": {"montant": 0, "devise": "XOF", "duree_jours": 30},
        "limits": {
            "workspaces": None,
            "espaces": None,
            "projets": None,
            "membres": None,
            "stockage_mo": None,
            "historique_jours": None,
        },
        "features": [
            "Workspace personnel cree automatiquement",
            "Gestion des espaces, projets, taches et checklists",
            "Canevas de projet et suivi d'avancement",
            "Messagerie de groupe basique",
            "Notifications essentielles",
            "Acces sans quotas de plan",
        ],
        "restrictions": [],
    },
    {
        "code": "PROFESSIONNEL",
        "nom": "Professionnel",
        "audience": "Pour une equipe structuree qui gere plusieurs projets actifs.",
        "description": "Plus de capacite, de collaboration et de suivi pour travailler en equipe.",
        "price_label": "5 000 XOF",
        "highlight": True,
        "billing": {"montant": 5000, "devise": "XOF", "duree_jours": 30},
        "limits": {
            "workspaces": None,
            "espaces": None,
            "projets": None,
            "membres": None,
            "stockage_mo": None,
            "historique_jours": None,
        },
        "features": [
            "Plusieurs workspaces",
            "Espaces et sous-espaces etendus",
            "Rapports de travail",
            "Fichiers plus volumineux",
            "Notifications avancees",
            "Appels audio et video",
            "Historique illimite",
        ],
        "restrictions": [],
    },
    {
        "code": "ENTREPRISE",
        "nom": "Entreprise",
        "audience": "Pour une organisation qui veut centraliser ses equipes et ses controles.",
        "description": "Le plan complet pour piloter une organisation avec supervision et gouvernance.",
        "price_label": "10 000 XOF",
        "highlight": False,
        "billing": {"montant": 10000, "devise": "XOF", "duree_jours": 30},
        "limits": {
            "workspaces": None,
            "espaces": None,
            "projets": None,
            "membres": None,
            "stockage_mo": None,
            "historique_jours": None,
        },
        "features": [
            "Workspaces, espaces et projets sans quotas de plan",
            "Rapports de travail avances",
            "Absences et conges",
            "Facturation centralisee",
            "Supervision des membres",
            "Securite renforcee",
            "Support prioritaire",
            "Branding et logo de l'entreprise",
            "Analyse de performance",
        ],
        "restrictions": [],
    },
]


def get_plan_catalog() -> list[dict]:
    return deepcopy(PLAN_CATALOG)


def get_plan_by_code(code: str) -> dict | None:
    normalized_code = code.strip().upper()
    return next((deepcopy(plan) for plan in PLAN_CATALOG if plan["code"] == normalized_code), None)
