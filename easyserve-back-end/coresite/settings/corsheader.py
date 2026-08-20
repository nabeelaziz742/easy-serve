CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOW_ALL_ORIGINS removed (F-05): it was silently overriding the
# restricted CORS_ALLOWED_ORIGINS allowlist defined in base.py, since
# corsheader.py is imported after base.py in settings/__init__.py.
# The allowlist in base.py (localhost, DOMAIN, *.koyeb.app) is now enforced.
