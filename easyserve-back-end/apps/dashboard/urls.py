from django.urls import path

from apps.dashboard.views import (
    MyAssignedTablesView,
    CurrentOrdersView,
    CustomerReviews,
    AddCustomerReview,
    ChangeOrderStatusView,
    WaiterDashboardAPIView,
    AddReviewView,
    ReviewListAPIView,
    OrderStatusAPIView,
    OrderStatusUpdateView,
    TablesListView,
)

urlpatterns = [
    path("waiter/dashboard/", WaiterDashboardAPIView.as_view()),
    path('my-assigned-tables/', MyAssignedTablesView.as_view(), name='my-assigned-tables'),
    path('current-orders/', CurrentOrdersView.as_view(), name='current-orders'),
    path('customer-reviews/', CustomerReviews.as_view(), name='customer-reviews'),
    path('add-customer-review/', AddCustomerReview.as_view(), name='add-customer-review'),
    path('change-order-status/<int:order_id>/',ChangeOrderStatusView.as_view(), name='change-order-status'),
    path("tables/", TablesListView.as_view(), name="tables-list"),
    path("tables/review/", AddReviewView.as_view(), name="create-review"),
    path("tables/reviews/", ReviewListAPIView.as_view(), name="reviews-list"),
    path("orders/status/", OrderStatusAPIView.as_view(), name="orders-status"),
    path("orders/<int:pk>/status/", OrderStatusUpdateView.as_view(), name="order-update-status"),
]
