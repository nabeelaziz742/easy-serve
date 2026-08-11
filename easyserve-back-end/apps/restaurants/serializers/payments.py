from rest_framework import serializers

from apps.restaurants.models import PaymentDetails


class PaymentDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentDetails model.
    """
    class Meta:
        model = PaymentDetails
        fields = ['id', 'user', 'order', 'payment_method',   'created_at']
        read_only_fields = ['id', 'user', 'order', 'created_at']
