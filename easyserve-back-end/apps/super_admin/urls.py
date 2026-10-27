from django.urls import path
from .views import OverviewMetricsAPIView, RestaurantOnboardingAPIView

urlpatterns = [
    path('overview/', OverviewMetricsAPIView.as_view(), name='superadmin-overview'),
    path('restaurants/', RestaurantOnboardingAPIView.as_view(), name='superadmin-onboard-restaurant'),
]
