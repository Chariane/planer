"""Modeles SQLAlchemy actifs de api_gateway.

Le fichier voisin ``../models.py`` reste le temoin legacy et ne doit pas etre
supprime pendant la migration. Pour garder le package strictement compatible
avec le modele actuel de l'API, on expose ici toutes les classes de ce temoin.
"""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

_LEGACY_MODELS_PATH = Path(__file__).resolve().parents[1] / "models.py"
_LEGACY_MODULE_NAME = f"{__name__}._legacy_current"
_legacy_spec = spec_from_file_location(_LEGACY_MODULE_NAME, _LEGACY_MODELS_PATH)

if _legacy_spec is None or _legacy_spec.loader is None:
    raise ImportError(f"Impossible de charger les modeles gateway depuis {_LEGACY_MODELS_PATH}")

_legacy_module = module_from_spec(_legacy_spec)
_legacy_spec.loader.exec_module(_legacy_module)

__all__ = [
    name
    for name, value in vars(_legacy_module).items()
    if isinstance(value, type) and getattr(value, "__module__", None) == _LEGACY_MODULE_NAME
]

globals().update({name: getattr(_legacy_module, name) for name in __all__})
