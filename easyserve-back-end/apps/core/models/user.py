from django.db import models

from apps import restaurants
from coresite.mixin import AbstractTimeStampModel
from django.contrib.auth.models import (
    BaseUserManager,
    AbstractBaseUser,
)


class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, user_type='user'):
        """
        Creates and saves a User with the given email, date of
        birth and password.
        """
        if not email:
            raise ValueError('Users must have an email address')

        user = self.model(
            email=self.normalize_email(email),
            username=username,
            user_type=user_type,
        )

        user.is_staff = True
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, username=None, password=None, user_type='super_admin'):
        """
        Creates and saves a superuser with the given email, date of
        birth and password.
        """
        user = self.create_user(
            email,
            password=password,
            username=username,
            user_type=user_type,
        )

        user.is_admin = True
        user.is_staff = True
        user.is_active = True
        user.is_superuser = True
        user.user_type = 'super_admin'
        user.save()
        return user


USER_TYPE_CHOICES = (
    ('user', 'User'),
    ('waiter', 'Waiter'),
    ('chef', 'Chef'),
    ('manager', 'Manager'),
    ('restaurant_owner', 'Restaurant Owner'),
    ('super_admin', 'Super Admin'),
)

class User(AbstractBaseUser, AbstractTimeStampModel):
    """
    Our custom user model that extends Django's AbstractBaseUser."""
    email = models.EmailField(
        verbose_name='email address',
        max_length=255,
        unique=True,
    )
    user_type = models.CharField(
        max_length=255, default='user', choices=USER_TYPE_CHOICES)
    username = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['password', 'username']

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        "Does the user have a specific permission?"
        # Simplest possible answer: Yes, always
        return True

    def has_module_perms(self, app_label):
        "Does the user have permissions to view the app `app_label`?"
        # Simplest possible answer: Yes, always
        return True
