from .environment import env, os, BASE_DIR

from .application import (
    DJANGO_APPLICATIONS,
    CUSTOM_APPLICATIONS,
    THIRD_PARTY_APPLICATIONS,
)

SETTINGS_PATH = os.path.dirname(
    os.path.dirname(
        os.path.dirname(__file__)
    )
)

# ==================================================
# CORE
# ==================================================

SECRET_KEY = env("SECRET_KEY")

DEBUG = env.bool("DEBUG", default=False)

DOMAIN = env("DOMAIN", default="")

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
]

if DOMAIN:
    ALLOWED_HOSTS += [
        DOMAIN,
        f".{DOMAIN}",
    ]

ROOT_URLCONF = "coresite.urls"

# ==================================================
# APPLICATIONS
# ==================================================

INSTALLED_APPS = [
    *DJANGO_APPLICATIONS,
    *CUSTOM_APPLICATIONS,
    *THIRD_PARTY_APPLICATIONS,
    'drf_spectacular',
    'drf_spectacular_sidecar',
]

ASGI_APPLICATION = "coresite.asgi.application"

WSGI_APPLICATION = "coresite.wsgi.application"

# ==================================================
# TEMPLATES
# ==================================================

TEMPLATES = [
    {
        "BACKEND":
            "django.template.backends.django.DjangoTemplates",

        "DIRS": [
            os.path.join(
                SETTINGS_PATH,
                "templates"
            )
        ],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",

                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ==================================================
# INTERNATIONALIZATION
# ==================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Karachi"

USE_I18N = True

USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ==================================================
# STATIC FILES
# ==================================================

STATIC_ROOT = os.path.join(
    BASE_DIR,
    "staticfiles"
)

STATIC_URL = "/static/"

STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
)

# ==================================================
# COMPANY SETTINGS
# ==================================================

COMPANY_NAME = env("COMPANY_NAME")

COMPANY_COPYRIGHT = env("COMPANY_COPYRIGHT")

COMPANY_ADDRESS = env("COMPANY_ADDRESS")

COMPANY_EMAIL = env("COMPANY_EMAIL")

COMPANY_PHONE = env("COMPANY_PHONE")

COMPANY_WEBSITE = env("COMPANY_WEBSITE")

COMPANY_LOGO = env("COMPANY_LOGO")

COMPANY_LOGO_TEXT = env("COMPANY_LOGO_TEXT")

PRIMARY_COLOR = env("PRIMARY_COLOR")

SECONDARY_COLOR = env("SECONDARY_COLOR")

BUTTON_COLOR = env("BUTTON_COLOR")

TEXT_COLOR = env("TEXT_COLOR")

STARTING_YEAR = env("COMPANY_STARTING_YEAR")

FROM_EMAIL = env("EMAIL_FROM")

REACT_DOMAIN = env("REACT_DOMAIN")

# ==================================================
# REDIS / CHANNELS
# ==================================================

SPECTACULAR_SETTINGS = {
    "TITLE": "Easy Serve API",
    "DESCRIPTION": "Easy Serve Backend APIs",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS":
        "drf_spectacular.openapi.AutoSchema",
}

REDIS_URL = env(
    "REDIS_URL",
    default=None
)

if REDIS_URL:

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND":
                "channels_redis.core.RedisChannelLayer",

            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }

# ==================================================
# CORS / CSRF
# ==================================================

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CSRF_TRUSTED_ORIGINS += [
    "https://*.koyeb.app",
]

if DOMAIN:

    CORS_ALLOWED_ORIGINS += [
        f"https://{DOMAIN}",
    ]

CORS_ALLOW_CREDENTIALS = True

# ==================================================
# SECURITY
# ==================================================

SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_HTTPONLY = True

SECURE_BROWSER_XSS_FILTER = True

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

# ==================================================
# LOGGING
# ==================================================

LOGGING = {
    "version": 1,

    "disable_existing_loggers": False,

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },

    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}