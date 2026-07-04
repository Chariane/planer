# Schemas api_espace

Ce dossier contient les schemas Pydantic actifs pour `api_espace`.

Le fichier `../schemas.py` est conserve comme temoin legacy et ne doit pas etre supprime pendant la migration progressive. En Python, l'import `backend.api_espace.schemas` pointe vers ce dossier parce qu'il contient un `__init__.py`.

La decoupe conserve les memes classes exportees par le schema temoin pour le domaine utilise par `api_espace`, afin de garder les endpoints et les shapes JSON actuels.
