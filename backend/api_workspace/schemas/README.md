# Schemas api_workspace

Ce dossier contient les schemas Pydantic actifs pour `api_workspace`.

Le fichier `../schemas.py` est conserve comme temoin legacy et ne doit pas etre supprime pendant la migration progressive. En Python, l'import `backend.api_workspace.schemas` pointe vers ce dossier parce qu'il contient un `__init__.py`.

Etat actuel: `__init__.py` n'importe pas le temoin `../schemas.py`. Les schemas exposes par `backend.api_workspace.schemas` viennent uniquement des fichiers de ce dossier. Le temoin reste present pour comparaison pendant la migration progressive.
