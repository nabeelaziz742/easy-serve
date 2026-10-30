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

STATICFILES_STORAGE = env(
    "STATICFILES_STORAGE",
    default="django.contrib.staticfiles.storage.StaticFilesStorage"
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
# RESERVATION REMINDERS
# ==================================================
# Which service sends the same-day welcome reminder: "" (none, managers send
# it from WhatsApp by hand), "whatsapp" (WhatsApp Cloud API), "twilio" (SMS),
# "console" (prints it, for testing) or a dotted path to a sender class.
RESERVATION_REMINDER_SENDER = env("RESERVATION_REMINDER_SENDER", default="")
# Added to local numbers such as 0300 1234567 to make 923001234567.
RESERVATION_PHONE_COUNTRY_CODE = env("RESERVATION_PHONE_COUNTRY_CODE", default="92")

WHATSAPP_TOKEN = env("WHATSAPP_TOKEN", default="")
WHATSAPP_PHONE_NUMBER_ID = env("WHATSAPP_PHONE_NUMBER_ID", default="")
# Business-started WhatsApp messages need an approved template. Its body
# takes five values: name, restaurant, time, guests and the cancel link.
WHATSAPP_TEMPLATE = env("WHATSAPP_TEMPLATE", default="")
WHATSAPP_TEMPLATE_LANGUAGE = env("WHATSAPP_TEMPLATE_LANGUAGE", default="en")

TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_FROM_NUMBER = env("TWILIO_FROM_NUMBER", default="")

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

# Dine-in guests identify their table session with this header instead of
# logging in (see apps/restaurants/services/dine_in_guest.py).
from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOW_HEADERS = (*default_headers, "x-dine-in-token")

# ==================================================
# SECURITY
# ==================================================

SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_HTTPONLY = True

SECURE_BROWSER_XSS_FILTER = True

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)

if not DEBUG and env.bool("SECURE_HSTS_ENABLED", default=False):
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
    SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)


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

# ==================================================
# STRIPE (ONLINE PAYMENTS)
# ==================================================

STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")