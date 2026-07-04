# Schemas api_gateway

Ce dossier contient les schemas Pydantic actifs pour `api_gateway`.

Le fichier `../schemas.py` est conserve comme temoin legacy et ne doit pas etre supprime pendant la migration progressive. En Python, l'import `backend.api_gateway.schemas` pointe vers ce dossier parce qu'il contient un `__init__.py`.

Les schemas d'authentification et de profil doivent rester strictement compatibles avec `../schemas.py`, car le frontend consomme directement les shapes JSON de `api_gateway`.
