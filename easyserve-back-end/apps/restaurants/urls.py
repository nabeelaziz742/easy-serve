from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.restaurants.views import (
    MenuListView,
    MenuDetailView,
    MenuItemListView,
    MenuItemDetailView,
    TableViewSet,
    QRScanView,
    DineInValidateAPIView,
    DineInStartSessionAPIView,
    CreateCartAPIView,
    CartItemCreateAPIView,
    RetrieveCartAPIView,
    DeleteCartItemAPIView,
    UpdateCartItemAPIView,
    ReviewViewSet,
    OrderCheckoutAPIView,
    OrderDetailAPIView,
    UserOrderHistoryAPIView,
    WaiterOrderListAPIView,
    RestaurantViewSet,
    ReservationDetailAPIView,
    ReservationListCreateAPIView,
    PendingOrderListAPIView,
    PayOrderAPIView,
    WaiterAcceptOrderAPIView,
    AssignChefAPIView,
    ChefOrderListAPIView,
    StartPreparingAPIView,
    MarkPreparedAPIView,
    MarkServedAPIView,
    ManagerDashboardAPIView,
    ReadyOrdersAPIView,
)
from apps.restaurants.views.ai import (
    RestaurantTopSuggestionsView,
    RestaurantMenuSuggestionsView
)

router = DefaultRouter()
router.register(r'tables', TableViewSet, basename='table')
router.register(r'reviews', ReviewViewSet, basename='reviews')
router.register(r'restaurants', RestaurantViewSet, basename='restaurant')

urlpatterns = [
    path('', include(router.urls)),

    path('restaurants/<int:restaurant_id>/menus/', MenuListView.as_view(),
         name='menu-list'),
    path('restaurants/<int:restaurant_id>/menus/<int:id>/',
         MenuDetailView.as_view(), name='menu-detail'),
    path('menus/<int:menu_id>/menu-items/', MenuItemListView.as_view(),
         name='menu-item-list'),
    path('menu-items/<int:id>/',
         MenuItemDetailView.as_view(), name='menu-item-detail'),

    # QR code scanning endpoint
    path(
        "tables/scan-qr/",
        QRScanView.as_view(),
        name="scan-qr"
    ),

    path(
        "dine-in/validate/",
        DineInValidateAPIView.as_view(),
        name='validate-dine-in',
    ),
    path(
        "dine-in/start-session/",
        DineInStartSessionAPIView.as_view(),
        name='start-dine-in-session',
    ),

    # AI suggestions endpoints
    path(
        'ai/restaurants/suggestions/top/',
        RestaurantTopSuggestionsView.as_view(),
         name='restaurant-suggestions-top'
    ),
    path(
        'ai/restaurants/<int:restaurant_id>/menus/suggestions/',
         RestaurantMenuSuggestionsView.as_view(),
        name='restaurant-menu-suggestions'
    ),

    # Cart and CartItem endpoints
    path(
        'cart/create-cart/',
        CreateCartAPIView.as_view(),
        name='create-cart'
    ),
    path(
        'cart/create-cart-item/',
        CartItemCreateAPIView.as_view(),
         name='create-cart-item'
    ),
    path(
        'cart/retrieve-cart/',
        RetrieveCartAPIView.as_view(),
        name='retrieve-cart'
    ),
    path('cart/delete-cart-item/<int:pk>/', DeleteCartItemAPIView.as_view(),
         name='delete-cart-item'),
    path(
        'cart/update-cart-item/<int:pk>/',
        UpdateCartItemAPIView.as_view(),
         name='update-cart-item'
    ),

    path(
        'orders/checkout-order/',
        OrderCheckoutAPIView.as_view(),
        name='checkout-order'
    ),
    path(
        'orders/',
        UserOrderHistoryAPIView.as_view(),
        name='user-order-history'
    ),
    path(
        'orders/<int:order_id>/',
        OrderDetailAPIView.as_view(),
        name='order-detail'
    ),
    path(
        'orders/<int:order_id>/pay/',
        PayOrderAPIView.as_view(),
        name='pay-order'
    ),
    path(
        'orders/waiter/',
        WaiterOrderListAPIView.as_view(),
        name='waiter-order-list'
    ),

    path(
        'reservations/',
        ReservationListCreateAPIView.as_view(),
        name='reservation-list-create'
    ),
    path(
        'reservations/<int:pk>/',
        ReservationDetailAPIView.as_view(),
        name='reservation-detail'
    ),

    # WAITER
    path(
        'orders/pending/',
        PendingOrderListAPIView.as_view(),
        name='pending-orders'
    ),
    path(
        'orders/<int:order_id>/accept/',
        WaiterAcceptOrderAPIView.as_view(),
        name='accept-order'
    ),
    path(
        'orders/<int:order_id>/assign-chef/',
        AssignChefAPIView.as_view(),
        name='assign-chef'
    ),

    # CHEF
    path(
        'orders/chef/',
        ChefOrderListAPIView.as_view(),
        name='chef-orders'
    ),
    path(
        'orders/<int:order_id>/start-preparing/',
        StartPreparingAPIView.as_view(),
        name='start-preparing'
    ),
    path(
        'orders/<int:order_id>/mark-prepared/',
        MarkPreparedAPIView.as_view(),
        name='mark-prepared'
    ),

    # WAITER SERVE
    path(
        'orders/<int:order_id>/mark-served/',
        MarkServedAPIView.as_view(),
        name='mark-served'
    ),

    # MANAGER
    path(
        'manager/dashboard/',
        ManagerDashboardAPIView.as_view(),
        name='manager-dashboard'
    ),
    path(
        'orders/ready/',
        ReadyOrdersAPIView.as_view(),
        name='ready-orders'
    ),
]
