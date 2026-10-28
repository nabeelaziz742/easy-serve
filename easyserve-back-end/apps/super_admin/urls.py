from django.urls import path
from .views import OverviewMetricsAPIView, RestaurantDetailAPIView, RestaurantOnboardingAPIView

urlpatterns = [
    path('overview/', OverviewMetricsAPIView.as_view(), name='superadmin-overview'),
    path('restaurants/', RestaurantOnboardingAPIView.as_view(), name='superadmin-onboard-restaurant'),
    path('restaurants/<int:pk>/', RestaurantDetailAPIView.as_view(), name='superadmin-restaurant-detail'),
]
