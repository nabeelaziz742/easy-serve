from django.contrib import admin

from .models import (
    Restaurant,
    RestaurantImage,
    Menu,
    MenuItem,
    MenuItemIngredient,
    Category,
    Orders,
    OrderItem,
    Review, Table,
    DineInSession,
    Reservation,
)


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'phone_number', 'email', 'id',)
    search_fields = ('name', 'address', 'phone_number', 'email')
    ordering = ('id', 'name',)

@admin.register(RestaurantImage)
class RestaurantImageAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'is_primary')
    search_fields = ('restaurant__name',)
    list_filter = ('is_primary',)
    ordering = ('restaurant',)

@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ('name', 'restaurant', 'id',)
    search_fields = ('name', 'restaurant__name')
    list_filter = ('restaurant',)
    ordering = ('id', 'restaurant', 'name')

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'menu', 'price', 'id',)
    list_filter = ('menu',)
    ordering = ('id', 'menu', 'name')

@admin.register(MenuItemIngredient)
class MenuItemIngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'menu_item', 'quantity', 'id',)
    search_fields = ('name', 'menu_item__name')
    list_filter = ('menu_item',)
    ordering = ('id', 'menu_item', 'name')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'id',)
    search_fields = ('name',)
    ordering = ('id', 'name',)

@admin.register(Orders)
class OrdersAdmin(admin.ModelAdmin):
    list_display = ('user', 'order_type', 'order_status', 'created_at', 'id',)
    search_fields = ('user__first_name', 'user__last_name', 'billing_email', 'billing_phone')
    list_filter = ('order_type', 'order_status', 'created_at')
    ordering = ('-created_at',)

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('menu_item', 'quantity', 'price')
    search_fields = ('menu_item__name',)
    ordering = ('-created_at',)

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('review_by', 'order', 'rate', 'created_at')
    search_fields = ('review_by', 'order__user__user_type')
    list_filter = ('rate', 'created_at')
    ordering = ('-created_at',)

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('table_name', 'id', 'table_state', 'restaurant', 'assigned_waiter', 'created_at')
    search_fields = ('restaurant__name', 'table_number', 'assigned_waiter__user__username')
    list_filter = ('restaurant', 'created_at')
    ordering = ('restaurant', 'table_number')

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'id', 'user', 'table', 'reservation_time', 'guest_count', 'status')
    search_fields = ('restaurant__name', 'user__user__username', 'table__table_number')
    list_filter = ('status', 'reservation_time')
    ordering = ('-reservation_time',)

@admin.register(DineInSession)
class DineInSessionAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'table', 'guests', 'status', 'opened_at')
    search_fields = ('restaurant__name', 'table__table_number')
    list_filter = ('status', 'opened_at')
    ordering = ('-opened_at',)
