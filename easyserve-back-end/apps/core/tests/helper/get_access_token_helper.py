from rest_framework_simplejwt.tokens import AccessToken


def generate_access_token(user):
    return str(AccessToken.for_user(user))