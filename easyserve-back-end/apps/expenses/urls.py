from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.expenses.views import (
    ExpenseCategoryViewSet,
    ExpenseViewSet,
)

router = DefaultRouter()
router.register(r'categories', ExpenseCategoryViewSet, basename='expenses-categories')
router.register(r'', ExpenseViewSet, basename='expenses')

urlpatterns = [
    path('', include(router.urls)),
]
