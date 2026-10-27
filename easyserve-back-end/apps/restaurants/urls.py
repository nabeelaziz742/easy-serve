from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.restaurants.views import (
    MenuListView, MenuDetailView, MenuItemListView, MenuItemDetailView,
    TableViewSet, DineInValidateAPIView, DineInStartSessionAPIView,
    CreateCartAPIView, CartItemCreateAPIView, RetrieveCartAPIView,
    DeleteCartItemAPIView, UpdateCartItemAPIView, ReviewViewSet,
    OrderCheckoutAPIView, OrderDetailAPIView, UserOrderHistoryAPIView,
    WaiterOrderListAPIView, RestaurantViewSet, ReservationDetailAPIView,
    ReservationListCreateAPIView, PendingOrderListAPIView,
    WaiterAcceptOrderAPIView, AssignChefAPIView, ChefOrderListAPIView,
    StartPreparingAPIView, MarkPreparedAPIView, MarkServedAPIView,
    ManagerDashboardAPIView, ReadyOrdersAPIView,
    RequestCashPaymentAPIView, ReceiveCashPaymentAPIView, SettleCashPaymentAPIView,
    WaiterCashOrdersAPIView, ManagerCashOrdersAPIView, PayOrderAPIView,
)
from apps.restaurants.views.secure_checkout import SecureOrderCheckoutAPIView
from apps.restaurants.views.dine_in_orders import DineInSessionOrdersAPIView
from apps.restaurants.views.ai import RestaurantTopSuggestionsView, RestaurantMenuSuggestionsView
from apps.restaurants.views.restaurant_settings import (
    RestaurantSettingsAPIView, RestaurantBillingInfoAPIView, OrderReceiptAPIView,
)
from apps.restaurants.views.order_management import ManagerOrderListAPIView, CancelOrderAPIView
from apps.restaurants.views.service_requests import (
    GuestServiceRequestAPIView, StaffServiceRequestListAPIView, ResolveServiceRequestAPIView,
)

router = DefaultRouter()
router.register(r'tables', TableViewSet, basename='table')
router.register(r'reviews', ReviewViewSet, basename='reviews')
router.register(r'restaurants', RestaurantViewSet, basename='restaurant')

urlpatterns = [
    path('', include(router.urls)),
    path('restaurants/<int:restaurant_id>/menus/', MenuListView.as_view(), name='menu-list'),
    path('restaurants/<int:restaurant_id>/menus/<int:id>/', MenuDetailView.as_view(), name='menu-detail'),
    path('menus/<int:menu_id>/menu-items/', MenuItemListView.as_view(), name='menu-item-list'),
    path('menu-items/<int:id>/', MenuItemDetailView.as_view(), name='menu-item-detail'),
    path('dine-in/validate/', DineInValidateAPIView.as_view(), name='validate-dine-in'),
    path('dine-in/start-session/', DineInStartSessionAPIView.as_view(), name='start-dine-in-session'),
    path('dine-in/orders/', DineInSessionOrdersAPIView.as_view(), name='dine-in-session-orders'),
    path('ai/restaurants/suggestions/top/', RestaurantTopSuggestionsView.as_view(), name='restaurant-suggestions-top'),
    path('ai/restaurants/<int:restaurant_id>/menus/suggestions/', RestaurantMenuSuggestionsView.as_view(), name='restaurant-menu-suggestions'),
    path('cart/create-cart/', CreateCartAPIView.as_view(), name='create-cart'),
    path('cart/create-cart-item/', CartItemCreateAPIView.as_view(), name='create-cart-item'),
    path('cart/retrieve-cart/', RetrieveCartAPIView.as_view(), name='retrieve-cart'),
    path('cart/delete-cart-item/<int:pk>/', DeleteCartItemAPIView.as_view(), name='delete-cart-item'),
    path('cart/update-cart-item/<int:pk>/', UpdateCartItemAPIView.as_view(), name='update-cart-item'),
    path('orders/checkout-order/', SecureOrderCheckoutAPIView.as_view(), name='checkout-order'),
    path('orders/', UserOrderHistoryAPIView.as_view(), name='user-order-history'),
    path('orders/<int:order_id>/', OrderDetailAPIView.as_view(), name='order-detail'),
    path('orders/<int:order_id>/pay/', PayOrderAPIView.as_view(), name='pay-order'),
    path('orders/<int:order_id>/cash-request/', RequestCashPaymentAPIView.as_view(), name='cash-request'),
    path('orders/<int:order_id>/cash-receive/', ReceiveCashPaymentAPIView.as_view(), name='cash-receive'),
    path('orders/<int:order_id>/cash-settle/', SettleCashPaymentAPIView.as_view(), name='cash-settle'),
    path('orders/waiter/cash/', WaiterCashOrdersAPIView.as_view(), name='waiter-cash-orders'),
    path('orders/manager/cash/', ManagerCashOrdersAPIView.as_view(), name='manager-cash-orders'),
    path('orders/waiter/', WaiterOrderListAPIView.as_view(), name='waiter-order-list'),
    path('reservations/', ReservationListCreateAPIView.as_view(), name='reservation-list-create'),
    path('reservations/<int:pk>/', ReservationDetailAPIView.as_view(), name='reservation-detail'),
    path('orders/pending/', PendingOrderListAPIView.as_view(), name='pending-orders'),
    path('orders/<int:order_id>/accept/', WaiterAcceptOrderAPIView.as_view(), name='accept-order'),
    path('orders/<int:order_id>/assign-chef/', AssignChefAPIView.as_view(), name='assign-chef'),
    path('orders/chef/', ChefOrderListAPIView.as_view(), name='chef-orders'),
    path('orders/<int:order_id>/start-preparing/', StartPreparingAPIView.as_view(), name='start-preparing'),
    path('orders/<int:order_id>/mark-prepared/', MarkPreparedAPIView.as_view(), name='mark-prepared'),
    path('orders/<int:order_id>/mark-served/', MarkServedAPIView.as_view(), name='mark-served'),
    path('manager/dashboard/', ManagerDashboardAPIView.as_view(), name='manager-dashboard'),
    path('manager/settings/', RestaurantSettingsAPIView.as_view(), name='manager-settings'),
    path('restaurants/<int:restaurant_id>/billing/', RestaurantBillingInfoAPIView.as_view(), name='restaurant-billing'),
    path('orders/<int:order_id>/receipt/', OrderReceiptAPIView.as_view(), name='order-receipt'),
    path('orders/ready/', ReadyOrdersAPIView.as_view(), name='ready-orders'),
    path('orders/manager/', ManagerOrderListAPIView.as_view(), name='manager-orders'),
    path('orders/<int:order_id>/cancel/', CancelOrderAPIView.as_view(), name='cancel-order'),
    path('dine-in/service-requests/', GuestServiceRequestAPIView.as_view(), name='guest-service-requests'),
    path('service-requests/', StaffServiceRequestListAPIView.as_view(), name='service-requests'),
    path('service-requests/<int:pk>/resolve/', ResolveServiceRequestAPIView.as_view(), name='resolve-service-request'),
]