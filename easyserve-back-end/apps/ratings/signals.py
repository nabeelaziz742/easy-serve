from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import RestaurantRating, MenuItemRating

@receiver(post_save, sender=RestaurantRating)
def update_restaurant_avg(sender, instance, **kwargs):
    restaurant = instance.restaurant
    qs = restaurant.ratings.all()
    restaurant.rating_count = qs.count()
    restaurant.average_rating = round(qs.aggregate(models.Avg("rating"))["rating__avg"], 2)
    restaurant.save(update_fields=["average_rating", "rating_count"])


@receiver(post_save, sender=MenuItemRating)
def update_menuitem_avg(sender, instance, **kwargs):
    item = instance.menu_item
    qs = item.ratings.all()
    item.rating_count = qs.count()
    item.average_rating = round(qs.aggregate(models.Avg("rating"))["rating__avg"], 2)
    item.save(update_fields=["average_rating", "rating_count"])
