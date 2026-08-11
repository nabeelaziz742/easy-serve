from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.owner.views import MenuItemViewSet

router = DefaultRouter()
router.register(r'', MenuItemViewSet, basename='menu-items')

urlpatterns = [
    path('', include(router.urls)),
]
