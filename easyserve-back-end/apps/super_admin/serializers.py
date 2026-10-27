from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.core.serializers.userlist import StaffCreateSerializer
from apps.core.services.staff import create_staff_member
from apps.restaurants.models import Menu, Restaurant, Table

User = get_user_model()

MAX_TABLES = 100


class ManagerAccountSerializer(StaffCreateSerializer):
    """The new restaurant's manager login. The role is always manager."""
    user_type = None

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value


class RestaurantOnboardingSerializer(serializers.ModelSerializer):
    """Creates a ready-to-run restaurant: the restaurant, its manager login,
    an empty menu for the manager to fill, and its tables."""

    manager = ManagerAccountSerializer(write_only=True)
    table_count = serializers.IntegerField(min_value=1, max_value=MAX_TABLES, write_only=True)
    table_capacity = serializers.IntegerField(min_value=1, max_value=20, default=4, write_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "id", "name", "description", "address", "city", "country", "cuisine",
            "phone_number", "email", "manager", "table_count", "table_capacity",
        ]
        read_only_fields = ["id"]

    @transaction.atomic
    def create(self, validated_data):
        manager = validated_data.pop("manager")
        table_count = validated_data.pop("table_count")
        capacity = validated_data.pop("table_capacity")

        restaurant = Restaurant.objects.create(**validated_data)
        create_staff_member(restaurant, user_type="manager", **manager)
        Menu.objects.create(restaurant=restaurant, name="Main Menu")
        # One by one, not bulk_create: Table.save() draws each QR code.
        for number in range(1, table_count + 1):
            Table.objects.create(restaurant=restaurant, table_number=number, capacity=capacity)
        return restaurant

    def to_representation(self, restaurant):
        manager = User.objects.filter(user_type="manager", profile__restaurant=restaurant).first()
        return {
            **super().to_representation(restaurant),
            "manager": {"username": manager.username, "email": manager.email} if manager else None,
            "table_count": restaurant.tables.count(),
        }
