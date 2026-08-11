from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from coresite.mixin import AbstractTimeStampModel


class RatingBase(AbstractTimeStampModel):
    """Abstract model shared by restaurant & menu item ratings."""
    user = models.ForeignKey(
        "userprofile.UserProfile",
        on_delete=models.CASCADE,
        related_name="%(class)s_ratings"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True


class RestaurantRating(RatingBase):
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="ratings"
    )

    class Meta:
        unique_together = ("user", "restaurant")
        verbose_name = "Restaurant Rating"
        verbose_name_plural = "Restaurant Ratings"


class MenuItemRating(RatingBase):
    menu_item = models.ForeignKey(
        "restaurants.MenuItem",
        on_delete=models.CASCADE,
        related_name="ratings"
    )

    class Meta:
        unique_together = ("user", "menu_item")
        verbose_name = "Menu Item Rating"
        verbose_name_plural = "Menu Item Ratings"
