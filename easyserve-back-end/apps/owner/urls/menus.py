from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.owner.views import MenuViewSet

router = DefaultRouter()
router.register(r'', MenuViewSet, basename='menus')

urlpatterns = [
    path('', include(router.urls)),
]
