from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Prefetch
from rest_framework import serializers

from apps.core.serializers.userlist import StaffCreateSerializer
from apps.core.services.staff import create_staff_member
from apps.restaurants.models import Menu, Restaurant, Table
from apps.userprofile.models import UserProfile

User = get_user_model()

MAX_TABLES = 100
MAX_LOGO_BYTES = 2 * 1024 * 1024


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


def restaurants_with_summary():
    """Restaurants with their manager logins and table count, in two queries."""
    managers = UserProfile.objects.filter(user__user_type="manager").select_related("user")
    return (
        Restaurant.objects
        .annotate(table_total=Count("tables"))
        .prefetch_related(Prefetch("waiters", queryset=managers, to_attr="managers"), "hours")
        .order_by("-created_at")
    )


def manager_summary(profile):
    user = profile.user
    return {
        "username": user.username,
        "email": user.email,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "phone": profile.phone or "",
    }


class RestaurantOnboardingSerializer(serializers.ModelSerializer):
    """Creates a ready-to-run restaurant: the restaurant, its manager login,
    an empty menu for the manager to fill, and its tables."""

    manager = ManagerAccountSerializer(write_only=True)
    table_count = serializers.IntegerField(min_value=1, max_value=MAX_TABLES, write_only=True)
    table_capacity = serializers.IntegerField(min_value=1, max_value=20, default=4, write_only=True)
    # Saved as the restaurant's weekly hours, the same ones the manager edits in Settings.
    open_time = serializers.TimeField(write_only=True)
    close_time = serializers.TimeField(write_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "id", "name", "description", "address", "city", "country", "cuisine",
            "phone_number", "email", "logo", "is_active", "created_at",
            "open_time", "close_time", "manager", "table_count", "table_capacity",
        ]
        read_only_fields = ["id", "is_active", "created_at"]

    def validate_logo(self, logo):
        if logo and logo.size > MAX_LOGO_BYTES:
            raise serializers.ValidationError("The logo must be 2 MB or smaller.")
        return logo

    def validate(self, attrs):
        if "open_time" in attrs or "close_time" in attrs:
            if attrs.get("open_time") is None or attrs.get("close_time") is None:
                raise serializers.ValidationError({"close_time": "Set both the opening and closing time."})
            if attrs["open_time"] == attrs["close_time"]:
                raise serializers.ValidationError({"close_time": "Closing time must differ from opening time."})
        return attrs

    @staticmethod
    def _save_hours(restaurant, validated_data):
        if "open_time" in validated_data:
            restaurant.set_daily_hours(validated_data.pop("open_time"), validated_data.pop("close_time"))

    @transaction.atomic
    def create(self, validated_data):
        hours = {key: validated_data.pop(key) for key in ("open_time", "close_time")}
        manager = validated_data.pop("manager")
        table_count = validated_data.pop("table_count")
        capacity = validated_data.pop("table_capacity")

        restaurant = Restaurant.objects.create(**validated_data)
        self._save_hours(restaurant, hours)
        create_staff_member(restaurant, user_type="manager", **manager)
        Menu.objects.create(restaurant=restaurant, name="Main Menu")
        # One by one, not bulk_create: Table.save() draws each QR code.
        for number in range(1, table_count + 1):
            Table.objects.create(restaurant=restaurant, table_number=number, capacity=capacity)
        return restaurants_with_summary().get(pk=restaurant.pk)

    def to_representation(self, restaurant):
        """Expects a restaurant from restaurants_with_summary()."""
        manager = restaurant.managers[0] if restaurant.managers else None
        hours = restaurant.hours.all()  # prefetched, ordered by day
        return {
            **super().to_representation(restaurant),
            "open_time": hours[0].open_time.strftime("%H:%M") if hours else None,
            "close_time": hours[0].close_time.strftime("%H:%M") if hours else None,
            "manager": manager_summary(manager) if manager else None,
            "table_count": restaurant.table_total,
        }


class ManagerUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(min_length=8, write_only=True, required=False)

    def validate_email(self, value):
        manager = self.context["manager"]
        if User.objects.filter(email__iexact=value).exclude(pk=manager.pk).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value


def redraw_table_qr_codes(restaurant):
    """The QR images carry the restaurant name. Same keys, so old prints still scan."""
    for table in restaurant.tables.all():
        table.render_qr_code()
        table.save(update_fields=["qr_code", "updated_at"])


def assign_manager(restaurant, user):
    """Make `user` this restaurant's only manager. The previous manager is
    unlinked (their account stays, with no restaurant) and `user` leaves
    their old restaurant."""
    UserProfile.objects.filter(restaurant=restaurant, user__user_type="manager").exclude(user=user).update(restaurant=None)
    UserProfile.objects.update_or_create(user=user, defaults={"restaurant": restaurant})


class RestaurantUpdateSerializer(RestaurantOnboardingSerializer):
    """Edits a restaurant and its manager login. Setting is_active to false
    locks its staff out (see utils.authentication) and hides it from guests."""

    manager = serializers.DictField(write_only=True, required=False)
    # Hand the restaurant to an existing manager account (moved from wherever it was).
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(user_type="manager"), write_only=True, required=False,
    )
    table_count = table_capacity = None

    class Meta(RestaurantOnboardingSerializer.Meta):
        fields = [
            f for f in RestaurantOnboardingSerializer.Meta.fields if f not in ("table_count", "table_capacity")
        ] + ["manager_id"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if "manager" in attrs and "manager_id" in attrs:
            raise serializers.ValidationError({"manager_id": "Change the manager or edit their details, not both."})
        return super().validate(attrs)

    def validate_manager(self, value):
        manager = self._manager()
        if manager is None:
            raise serializers.ValidationError("This restaurant has no manager login.")
        serializer = ManagerUpdateSerializer(data=value, context={"manager": manager})
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _manager(self):
        managers = self.instance.managers
        return managers[0].user if managers else None

    @transaction.atomic
    def update(self, restaurant, validated_data):
        manager_data = validated_data.pop("manager", None)
        new_manager = validated_data.pop("manager_id", None)
        renamed = validated_data.get("name", restaurant.name) != restaurant.name
        self._save_hours(restaurant, validated_data)
        super().update(restaurant, validated_data)
        if renamed:
            redraw_table_qr_codes(restaurant)
        if manager_data:
            user = self._manager()
            password = manager_data.pop("password", None)
            if password:
                user.set_password(password)
            if "email" in manager_data:
                user.email = manager_data.pop("email")
            user.save()
            UserProfile.objects.filter(user=user).update(**manager_data)
        if new_manager:
            assign_manager(restaurant, new_manager)
        return restaurants_with_summary().get(pk=restaurant.pk)
