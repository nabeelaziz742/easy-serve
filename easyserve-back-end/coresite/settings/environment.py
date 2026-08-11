import os
import environ
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured


env = environ.Env()
environ.Env.read_env()

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))
except FileNotFoundError:
    pass  # No .env, probably running in cloud environment

def env_to_enum(enum_cls, value):
    for x in enum_cls:
        if x.value == value:
            return x

    raise ImproperlyConfigured(
        f"Env value {repr(value)} could not be found in {repr(enum_cls)}")
