from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.financial.permissions import get_request_restaurant
from apps.restaurants.models import Orders, PaymentDetails, Restaurant, RestaurantHour
from apps.restaurants.permissions import IsManager
from apps.restaurants.services.dine_in_guest import guest_owns_order
from apps.restaurants.services.order_access import (
    get_order_restaurant_id,
    staff_belongs_to_order_restaurant,
)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class RestaurantHourSerializer(serializers.ModelSerializer):
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)

    class Meta:
        model = RestaurantHour
        fields = ["day_of_week", "open_time", "close_time"]


class RestaurantSettingsSerializer(serializers.ModelSerializer):
    hours = RestaurantHourSerializer(many=True, required=False)
    tax_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0"), max_value=Decimal("100")
    )
    service_charge_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0"), max_value=Decimal("100")
    )

    class Meta:
        model = Restaurant
        fields = [
            "id", "name", "description", "cuisine", "address", "city", "country",
            "phone_number", "email",
            "tax_label", "tax_percent", "service_charge_percent", "tax_number", "receipt_footer",
            "hours",
        ]
        read_only_fields = ["id"]

    def validate_hours(self, hours):
        days = [h["day_of_week"] for h in hours]
        if len(days) != len(set(days)):
            raise serializers.ValidationError("Each day can only be listed once.")
        return hours

    @transaction.atomic
    def update(self, instance, validated_data):
        hours = validated_data.pop("hours", None)
        instance = super().update(instance, validated_data)
        if hours is not None:
            instance.hours.all().delete()
            RestaurantHour.objects.bulk_create(
                RestaurantHour(restaurant=instance, **h) for h in hours
            )
        return instance


class RestaurantSettingsAPIView(APIView):
    """The manager's own restaurant profile, opening hours and billing rates."""
    permission_classes = [IsManager]

    def get_restaurant(self, request):
        restaurant = get_request_restaurant(request)
        if restaurant is None:
            return None, Response(
                {"detail": "No restaurant is linked to your account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return restaurant, None

    def get(self, request):
        restaurant, error = self.get_restaurant(request)
        if error:
            return error
        return Response(RestaurantSettingsSerializer(restaurant).data)

    def patch(self, request):
        restaurant, error = self.get_restaurant(request)
        if error:
            return error
        serializer = RestaurantSettingsSerializer(restaurant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(RestaurantSettingsSerializer(restaurant).data)


class RestaurantBillingInfoAPIView(APIView):
    """Public tax and service charge rates, so the cart can show the real bill."""
    permission_classes = [AllowAny]

    def get(self, request, restaurant_id):
        restaurant = get_object_or_404(Restaurant, id=restaurant_id)
        return Response({
            "tax_label": restaurant.tax_label,
            "tax_percent": restaurant.tax_percent,
            "service_charge_percent": restaurant.service_charge_percent,
        })


class OrderReceiptAPIView(APIView):
    """Printable bill for one order.

    Readable by the customer who placed it, the guest browser holding the
    table session token, and staff of the order's restaurant.
    """
    permission_classes = [AllowAny]

    def get(self, request, order_id):
        order = get_object_or_404(
            Orders.objects.select_related("table", "waiter", "dine_in_session"),
            id=order_id,
        )
        user = request.user
        is_customer = (
            user.is_authenticated
            and getattr(user, "profile", None) is not None
            and order.user_id == user.profile.id
        )
        is_staff = (
            user.is_authenticated
            and getattr(user, "user_type", None) in ("waiter", "chef", "manager", "restaurant_owner", "super_admin")
            and staff_belongs_to_order_restaurant(user, order)
        )
        if not (is_customer or is_staff or guest_owns_order(request, order)):
            return Response({"detail": "You are not allowed to view this bill."}, status=status.HTTP_403_FORBIDDEN)

        restaurant = Restaurant.objects.filter(id=get_order_restaurant_id(order)).first()

        items = [
            {
                "name": item.menu_item.name,
                "quantity": item.quantity,
                "price": item.price,
                "amount": item.price * item.quantity,
                "comments": item.comments or "",
            }
            for item in order.items.select_related("menu_item")
        ]

        subtotal = order.subtotal
        if not subtotal and not order.tax_amount and not order.service_charge_amount:
            # Orders created outside checkout (seed data) have no breakdown.
            subtotal = order.total_price

        payment = PaymentDetails.objects.filter(order=order).order_by("-id").first()
        payment_method = payment.get_payment_method_display() if payment else None

        return Response({
            "order_id": order.id,
            "ordered_date": order.ordered_date or order.created_at,
            "order_type": order.get_order_type_display(),
            "order_status": order.get_order_status_display(),
            "payment_status": order.get_payment_status_display(),
            "payment_method": payment_method,
            "table_number": order.table.table_number if order.table_id else None,
            "waiter_name": order.waiter.full_name if order.waiter_id else None,
            "customer_name": " ".join(
                part for part in (order.billing_first_name, order.billing_last_name) if part
            ) or None,
            "restaurant": {
                "name": restaurant.name if restaurant else "",
                "address": restaurant.address if restaurant else "",
                "city": restaurant.city if restaurant else "",
                "phone_number": restaurant.phone_number if restaurant else "",
                "tax_label": restaurant.tax_label if restaurant else "GST",
                "tax_number": restaurant.tax_number if restaurant else "",
                "receipt_footer": restaurant.receipt_footer if restaurant else "",
            },
            "items": items,
            "subtotal": subtotal,
            "service_charge": order.service_charge_amount,
            "tax": order.tax_amount,
            "total": order.total_price,
        })
