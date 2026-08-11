from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from apps.restaurants.models import Orders
from apps.restaurants.constants import PaymentStatus
from apps.dashboard.serializers import OrderStatusSerializer
from django.utils import timezone
from datetime import timedelta


class OrderStatusAPIView(ListAPIView):
    serializer_class = OrderStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if not profile or not user.user_type == 'waiter' or not profile.restaurant:
            return Orders.objects.none()


        # last 24 hours
        one_day_ago = timezone.now() - timedelta(hours=22)

        return (
            Orders.objects.filter(
                table__restaurant=profile.restaurant,
                payment_status=PaymentStatus.PENDING,
                updated_at__gte=one_day_ago
            ).select_related('user', 'table')
            .prefetch_related('items__menu_item')
            .order_by('created_at')
        )