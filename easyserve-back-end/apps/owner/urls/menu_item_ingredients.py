from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.owner.views import MenuItemIngredientViewSet

router = DefaultRouter()
router.register(r'', MenuItemIngredientViewSet, basename='menu-item-ingredients')

urlpatterns = [
    path('', include(router.urls)),
]
