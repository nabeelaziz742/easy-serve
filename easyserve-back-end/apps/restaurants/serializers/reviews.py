from rest_framework import serializers
from apps.restaurants.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'order', 'user', 'rate', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'order']

class CreateReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'order', 'rate', 'comment']
        read_only_fields = ['id']

    def validate_rate(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rate must be between 1 and 5.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, "user"):
            validated_data['user'] = request.user.profile
        return super().create(validated_data)

class ReviewCreateSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()

    def get_customer(self, obj):
        return obj.order.user.id if obj.order and obj.order.user else None

    class Meta:
        model = Review
        fields = ["order", "rate", "comment", "created_by", "customer",]

    def validate_rate(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        order = data["order"]

        if hasattr(order, "review"):
            raise serializers.ValidationError("Review already submitted for this order.")

        return data

    def create(self, validated_data):
        order = validated_data["order"]
        created_by = validated_data["created_by"]  # <- FIXED

        if created_by == "waiter":
            request = self.context.get("request")
            waiter = request.user.profile if request else None
        else:
            waiter = getattr(order, "waiter", None)
        user = order.user
        
        return Review.objects.create(
            user=user,
            waiter=waiter,
            **validated_data
        )
