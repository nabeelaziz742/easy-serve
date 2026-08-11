from rest_framework.generics import CreateAPIView, UpdateAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from apps.restaurants.models import Cart, CartItem, MenuItem
from apps.restaurants.serializers import CartSerializer, CartItemSerializer
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import status


class CreateCartAPIView(CreateAPIView):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        cart, _ = Cart.objects.get_or_create(user=request.user.profile)

        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)

class RetrieveCartAPIView(APIView):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            cart, _= Cart.objects.get_or_create(user=request.user.profile)

            return Response(CartSerializer(cart).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CartItemCreateAPIView(CreateAPIView):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            menu_item_id = request.data.get('menu_item')
            comments = request.data.get('comments')
            quantity = int(request.data.get('quantity', 1))

            menu_item = get_object_or_404(MenuItem, id=menu_item_id)
            cart, _ = Cart.objects.get_or_create(user=request.user.profile)

            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                menu_item=menu_item,
                defaults={
                    "quantity": quantity,
                    "comments": comments,
                    "price": menu_item.price,
                },
            )

            if not created:
                cart_item.quantity += quantity
                if comments:
                    cart_item.comments = comments
                cart_item.save()

            cart.update_total_price()
            cart.save()

            return Response(CartItemSerializer(cart_item).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UpdateCartItemAPIView(UpdateAPIView):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        try:
            cart_item = self.get_object()
            comments = request.data.get('comments', cart_item.comments)
            cart_item.comments = comments
            quantity = int(request.data.get('quantity', cart_item.quantity))

            cart_item.quantity = quantity
            cart_item.save()

            cart = cart_item.cart
            cart.update_total_price()

            return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DeleteCartItemAPIView(DestroyAPIView):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        try:
            cart_item = self.get_object()
            cart = get_object_or_404(Cart, cart_items=cart_item)
            cart.total_price -= cart_item.price * cart_item.quantity
            cart.save()
            cart_item.menu_item.save()
            cart_item.delete()
            return Response(CartSerializer(cart).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
