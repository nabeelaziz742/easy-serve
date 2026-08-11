from django.db import models
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Table


class WaiterActivity(models.Model):
    waiter = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    table = models.ForeignKey(Table, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)  # seated, served, cleaned, billed
    timestamp = models.DateTimeField(auto_now_add=True)
