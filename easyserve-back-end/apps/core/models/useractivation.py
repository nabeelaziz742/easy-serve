from django.db import models
from django.contrib.auth import get_user_model
from coresite.mixin import AbstractTimeStampModel

User = get_user_model()


class UserActivation(AbstractTimeStampModel):
    """
    Here you can activate your account
    """
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='user_activation', unique=True)
    token = models.CharField(max_length=100, unique=True)
    activated = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username

    class Meta:
        verbose_name_plural = 'UserActivation'
