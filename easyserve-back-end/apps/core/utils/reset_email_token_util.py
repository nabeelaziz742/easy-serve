import random
import string
from apps.core.models import UserActivation, ForgetPassword


def reset_email_token(length=100, otp=None):

    secret_key = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for _ in range(length))
    user_activation = UserActivation.objects.filter(token=secret_key)
    forgot_password = ForgetPassword.objects.filter(token=secret_key)

    if user_activation.exists() or forgot_password.exists():
        reset_email_token(length)
    return secret_key
