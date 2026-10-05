from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.inventory.views import (
    UnitOfMeasureViewSet,
    InventoryCategoryViewSet,
    InventoryItemViewSet,
    StockMovementLogListView,
    StockAdjustmentAPIView,
    InventorySummaryAPIView,
    StockWastageViewSet,
    StockWastageSummaryAPIView,
    StockCountAPIView,
)

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-items')
router.register(r'categories', InventoryCategoryViewSet, basename='inventory-categories')
router.register(r'units', UnitOfMeasureViewSet, basename='inventory-units')
router.register(r'wastage', StockWastageViewSet, basename='inventory-wastage')

urlpatterns = [
    path('summary/', InventorySummaryAPIView.as_view(), name='inventory-summary'),
    path('wastage/summary/', StockWastageSummaryAPIView.as_view(), name='inventory-wastage-summary'),
    path('stock-count/', StockCountAPIView.as_view(), name='inventory-stock-count'),
    path('movements/', StockMovementLogListView.as_view(), name='inventory-movements'),
    path('adjustments/', StockAdjustmentAPIView.as_view(), name='inventory-adjustments'),
    path('', include(router.urls)),
]
