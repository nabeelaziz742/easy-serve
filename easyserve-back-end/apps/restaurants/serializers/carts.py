from rest_framework import serializers
from apps.restaurants.models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for CartItem model.
    """
    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'menu_item', 'quantity', 'comments', 'price']
        read_only_fields = ['id', 'cart']

class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for Cart model.
    """
    cart_items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'total_price', 'cart_items']
        read_only_fields = ['id', 'user', 'total_price']