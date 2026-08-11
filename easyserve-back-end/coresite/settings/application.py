DJANGO_APPLICATIONS = [
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.contenttypes',

]

CUSTOM_APPLICATIONS = [
    'apps.core',
    'apps.userprofile',
    "apps.restaurants",
    "apps.super_admin",
    'apps.owner',
    'apps.dashboard',
    'apps.ratings',
    'apps.payment',
    'apps.recommendation',

]

THIRD_PARTY_APPLICATIONS = [

    'corsheaders',
    'drf_yasg',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
]
