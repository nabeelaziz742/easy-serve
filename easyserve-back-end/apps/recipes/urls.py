from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.recipes.views import (
    RecipeViewSet,
    RecipeSummaryAPIView,
)

router = DefaultRouter()
router.register(r'', RecipeViewSet, basename='recipes')

urlpatterns = [
    path('summary/', RecipeSummaryAPIView.as_view(), name='recipes-summary'),
    path('', include(router.urls)),
]
