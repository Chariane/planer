# Schemas api_workspace

Ce dossier contient les schemas Pydantic actifs pour `api_workspace`.

Le fichier `../schemas.py` est conserve comme temoin legacy et ne doit pas etre supprime pendant la migration progressive. En Python, l'import `backend.api_workspace.schemas` pointe vers ce dossier parce qu'il contient un `__init__.py`.

Les schemas de workspaces, membres, invitations et abonnements doivent rester compatibles avec `../schemas.py`, car le frontend consomme directement les shapes JSON actuels.
