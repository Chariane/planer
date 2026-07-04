# Modeles api_workspace

Ce dossier contient les modeles SQLAlchemy actifs pour `api_workspace`.

Le fichier `../models.py` est conserve comme temoin legacy et ne doit pas etre supprime pendant la migration progressive. En Python, l'import `backend.api_workspace.models` pointe vers ce dossier parce qu'il contient un `__init__.py`.

Etat actuel: `__init__.py` expose toutes les classes du temoin `../models.py` afin que le package reste strictement compatible avec le modele actuel de l'API. Les fichiers decoupes du dossier restent en place pour poursuivre la migration progressivement, sans supprimer le temoin.
