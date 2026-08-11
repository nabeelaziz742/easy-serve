import random
import string
import base64
from core.models import UserActivation
# from core.helper import expire_account_activation_link


def create_secret_key(length, instance):
    """ This function used for generate random secret key """
    letters = string.ascii_letters
    text = 'TR-'.join(random.choice(letters) for i in range(length))
    secret_key = base64.b64encode(text.encode('utf-8')).decode('utf-8')
    user_activation, _ = UserActivation.objects.get_or_create(
        user=instance)
    user_activation.activation_token = secret_key
    user_activation.is_expired = False
    user_activation.activated = False
    user_activation.save()
    # expire_account_activation_link(secret_key=user_activation.id)
    return text


def get_secret_key(instance):
    """ This function used for get text from secret key """
    base64_message = instance.activation_token
    decoded_bytes = base64.b64decode(base64_message)
    decoded_text = decoded_bytes.decode('utf-8')
    return decoded_text
