from django.urls import path
from .views import ManagerListAPIView, OverviewMetricsAPIView, RestaurantDetailAPIView, RestaurantOnboardingAPIView

urlpatterns = [
    path('overview/', OverviewMetricsAPIView.as_view(), name='superadmin-overview'),
    path('restaurants/', RestaurantOnboardingAPIView.as_view(), name='superadmin-onboard-restaurant'),
    path('managers/', ManagerListAPIView.as_view(), name='superadmin-managers'),
    path('restaurants/<int:pk>/', RestaurantDetailAPIView.as_view(), name='superadmin-restaurant-detail'),
]
