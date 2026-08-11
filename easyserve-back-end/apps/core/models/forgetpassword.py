from django.db import models
from django.contrib.auth import get_user_model
from coresite.mixin import AbstractTimeStampModel


User = get_user_model()


class ForgetPassword(AbstractTimeStampModel):
    """
    Here you can reset your password in case you lost your password
    """
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='forget_password', unique=True, primary_key=True)
    token = models.CharField(max_length=255)
    activated = models.BooleanField(default=True)
    is_expired = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = 'ForgetPassword'
