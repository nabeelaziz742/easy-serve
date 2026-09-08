import os
from .environment import env, BASE_DIR

database_engine = env("DATABASE_ENGINE", default="")
database_url = env("DATABASE_URL", default="")
database_name = env("DATABASE_NAME", default="")

if database_url:
    DATABASES = {
        "default": env.db("DATABASE_URL", default=database_url)
    }
elif database_engine == "django.db.backends.postgresql" or (database_name and env("DATABASE_USER", default="")):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("DATABASE_NAME"),
            "USER": env("DATABASE_USER"),
            "PASSWORD": env("PASSWORD", default=""),
            "HOST": env("HOST", default="localhost"),
            "PORT": env("DB_PORT", default="5432"),
            "ATOMIC_REQUESTS": True,
            "OPTIONS": {
                "sslmode": env("SSL_MODE", default="prefer"),
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.path.join(BASE_DIR.parent, "db.sqlite3"),
            # Multiple pages poll the API every few seconds (waiter/chef/manager
            # dashboards). SQLite serializes writes, and without a timeout a
            # concurrent read/write collision raises "database is locked"
            # immediately instead of waiting briefly for the lock to clear.
            "OPTIONS": {
                "timeout": 20,
            },
        }
    }