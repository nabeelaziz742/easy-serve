from rest_framework import serializers

from apps.restaurants.constants import OrderStatus, PaymentStatus, ReviewBy
from apps.restaurants.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "order", "user", "rate", "comment", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "user", "order"]


class CreateReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "order", "rate", "comment"]
        read_only_fields = ["id"]

    def validate_rate(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rate must be between 1 and 5.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        order = attrs["order"]
        profile = getattr(request.user, "profile", None) if request else None

        if profile is None or order.user_id != profile.id:
            raise serializers.ValidationError("You can only review your own order.")
        if order.order_status != OrderStatus.SERVED.value:
            raise serializers.ValidationError("You can review an order only after it has been served.")
        if order.payment_status != PaymentStatus.CONFIRMED.value:
            raise serializers.ValidationError("You can review an order only after payment is confirmed.")
        if hasattr(order, "review"):
            raise serializers.ValidationError("Review already submitted for this order.")
        return attrs

    def create(self, validated_data):
        order = validated_data["order"]
        return Review.objects.create(
            user=order.user,
            waiter=order.waiter,
            review_by=ReviewBy.CUSTOMER.value,
            **validated_data,
        )


class ReviewCreateSerializer(serializers.ModelSerializer):
    created_by = serializers.ChoiceField(
        choices=("customer", "waiter"),
        write_only=True,
        required=False,
        default="customer",
    )
    customer = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Review
        fields = ["order", "rate", "comment", "created_by", "customer"]

    def get_customer(self, obj):
        return obj.order.user.id if obj.order and obj.order.user else None

    def validate_rate(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        order = data["order"]
        request = self.context.get("request")
        profile = getattr(request.user, "profile", None) if request else None
        created_by = data.get("created_by", "customer")

        if hasattr(order, "review"):
            raise serializers.ValidationError("Review already submitted for this order.")

        if created_by == "customer":
            if profile is None or order.user_id != profile.id:
                raise serializers.ValidationError("You can only review your own order.")
            if order.order_status != OrderStatus.SERVED.value:
                raise serializers.ValidationError("You can review an order only after it has been served.")
            if order.payment_status != PaymentStatus.CONFIRMED.value:
                raise serializers.ValidationError("You can review an order only after payment is confirmed.")
        elif profile is None or getattr(profile.user, "user_type", None) != "waiter":
            raise serializers.ValidationError("Only a waiter can submit a waiter review.")

        return data

    def create(self, validated_data):
        created_by = validated_data.pop("created_by", "customer")
        order = validated_data["order"]
        request = self.context.get("request")
        profile = request.user.profile

        if created_by == "waiter":
            waiter = profile
            review_by = ReviewBy.WAITER.value
        else:
            waiter = order.waiter
            review_by = ReviewBy.CUSTOMER.value

        return Review.objects.create(
            user=order.user,
            waiter=waiter,
            review_by=review_by,
            **validated_data,
        )
