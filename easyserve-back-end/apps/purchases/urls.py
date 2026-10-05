from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.purchases.views import (
    SupplierViewSet,
    PurchaseOrderViewSet,
    PurchasesSummaryAPIView,
)

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='purchases-supplier')
router.register(r'orders', PurchaseOrderViewSet, basename='purchases-order')

urlpatterns = [
    path('summary/', PurchasesSummaryAPIView.as_view(), name='purchases-summary'),
    path('', include(router.urls)),
]
