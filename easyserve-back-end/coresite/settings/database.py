# from .environment import env


# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': env('DATABASE_NAME'),
#         'USER': env('DATABASE_USER'),
#         'PASSWORD': env('PASSWORD'),
#         'HOST': env('HOST'),
#         'PORT': env('DB_PORT'),
#         'ATOMIC_REQUESTS': True,
#         'OPTIONS': {
#             'sslmode': env('SSL_MODE', default='require'),
#         }
#     }
# }

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'db.sqlite3',
    }
}
