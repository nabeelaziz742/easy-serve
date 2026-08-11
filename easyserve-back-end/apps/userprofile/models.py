from django.db import models

from apps import restaurants
from apps.core.models import User
from coresite.mixin import AbstractTimeStampModel


class UserProfile(AbstractTimeStampModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='profile')
    profile_id = models.CharField(max_length=20, default="ID_NOT", null=True, blank=True)
    bio = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    image = models.ImageField(
        upload_to='profiles/',
        default='profiles/default_profile.png',
        blank=True, null=True
    )
    selected_restaurant = models.PositiveIntegerField(blank=True, null=True,)
    shift_start = models.TimeField(default="12:00")
    shift_end = models.TimeField(default="22:00")
    avg_serve_time = models.CharField(max_length=255, default="00", null=True, blank=True)
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='waiters',
    )

    avg_rating = models.FloatField(default=0)
    total_reviews = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.full_name
    
    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

class Notification(AbstractTimeStampModel):
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="notifications"
    )
    message = models.CharField(max_length=255)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.profile.user.username}: {self.message[:20]}"