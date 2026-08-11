from django.urls import path
from .views import RateRestaurantAPIView, RateMenuItemAPIView, RestaurantReviewsAPIView

urlpatterns = [
    path("rate/restaurant/", RateRestaurantAPIView.as_view(), name="rate-restaurant"),
    path("rate/menu-item/", RateMenuItemAPIView.as_view(), name="rate-menu-item"),
    path("restaurant-reviews/", RestaurantReviewsAPIView.as_view(), name="restaurant-reviews"),
]