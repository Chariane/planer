# Modeles api_workspace

Ce dossier contient les modeles SQLAlchemy actifs pour `api_workspace`.

Le fichier `../models.py` est conserve comme temoin legacy et ne doit pas etre supprime pendant la migration progressive. En Python, l'import `backend.api_workspace.models` pointe vers ce dossier parce qu'il contient un `__init__.py`.

Etat actuel: `__init__.py` n'importe plus le temoin `../models.py`. Les classes exposees par `backend.api_workspace.models` viennent uniquement des fichiers de ce dossier. Le temoin reste present pour comparaison pendant la migration progressive.
