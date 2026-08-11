from django.urls import path, include
from .views import UserProfileViewSet, SelectedRestaurantAPIView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('user-profile', UserProfileViewSet, basename='userprofile')

urlpatterns = [
    path('', include(router.urls)),

    path('user-profile/selected-restaurant', SelectedRestaurantAPIView.as_view(),
         name='user_profile-restaurant-select'),
]
