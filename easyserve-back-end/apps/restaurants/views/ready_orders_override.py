from django.db.models import Q
from rest_framework.generics import ListAPIView

from apps.restaurants.constants import OrderStatus
from apps.restaurants.models import Orders
from apps.restaurants.permissions import IsWaiter
from apps.restaurants.serializers import OrderSerializer


class ReadyOrdersAPIView(ListAPIView):
    """Return prepared orders that the waiter can actually serve.

    The waiter assignment is the primary ownership signal. Restaurant
    matching remains as a fallback so an order that was prepared before
    waiter assignment (or whose legacy waiter link is missing) is still
    visible to the correct restaurant waiter.
    """

    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        profile = self.request.user.profile
        restaurant_id = profile.restaurant_id

        if restaurant_id is None:
            return Orders.objects.filter(
                order_status=OrderStatus.PREPARED,
                waiter=profile,
            ).order_by("-created_at")

        return (
            Orders.objects
            .filter(order_status=OrderStatus.PREPARED)
            .filter(
                Q(waiter=profile)
                | Q(table__restaurant_id=restaurant_id)
                | Q(items__menu_item__menu__restaurant_id=restaurant_id)
            )
            .distinct()
            .order_by("-created_at")
        )
