from datetime import timedelta

from django.db.models import Sum
from django.utils.timezone import now
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response

from utils.permissions import IsSuperAdmin
from apps.restaurants.models import Restaurant, Orders
from apps.restaurants.constants import PaymentStatus
from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.super_admin.serializers import (
    RestaurantOnboardingSerializer, RestaurantUpdateSerializer, restaurants_with_summary,
)


class OverviewMetricsAPIView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        today = now().date()

        total_restaurants = Restaurant.objects.count()
        total_orders_today = Orders.objects.filter(created_at__date=today).count()
        revenue_today = Orders.objects.filter(
            created_at__date=today,
            payment_status=PaymentStatus.CONFIRMED.value,
        ).aggregate(total=Sum("total_price"))["total"] or 0
        active_users = User.objects.filter(is_active=True).count()

        labels = []
        trend_data = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            labels.append(day.strftime("%a"))
            trend_data.append(Orders.objects.filter(created_at__date=day).count())

        latest_restaurants = [
            {
                "id": r.id,
                "name": r.name,
                "is_active": r.is_active,
                "created": r.created_at.date().isoformat(),
            }
            for r in Restaurant.objects.order_by("-created_at")[:5]
        ]

        recent_orders = []
        for order in Orders.objects.order_by("-created_at")[:5]:
            if order.table_id and order.table.restaurant_id:
                restaurant_name = order.table.restaurant.name
            else:
                first_item = order.items.select_related(
                    "menu_item__menu__restaurant"
                ).first()
                restaurant_name = (
                    first_item.menu_item.menu.restaurant.name if first_item else "N/A"
                )
            recent_orders.append({
                "id": order.id,
                "restaurant": restaurant_name,
                "total": float(order.total_price),
            })

        data = {
            "total_restaurants": total_restaurants,
            "total_orders_today": total_orders_today,
            "revenue_today": float(revenue_today),
            "active_users": active_users,
            "orders_trend": {
                "labels": labels,
                "data": trend_data,
            },
            "latest_restaurants": latest_restaurants,
            "recent_orders": recent_orders,
        }
        return Response(data)


class RestaurantOnboardingAPIView(ListCreateAPIView):
    """GET: every restaurant with its manager login and table count.
    POST: create a restaurant with its manager login and tables in one step."""
    permission_classes = [IsSuperAdmin]
    serializer_class = RestaurantOnboardingSerializer
    pagination_class = None

    def get_queryset(self):
        return restaurants_with_summary()


class ManagerListAPIView(APIView):
    """Every manager login and the restaurant it runs, for "Change manager"."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        profiles = UserProfile.objects.filter(user__user_type="manager").select_related("user", "restaurant")
        return Response([
            {
                "id": p.user_id,
                "username": p.user.username,
                "email": p.user.email,
                "name": f"{p.first_name} {p.last_name}".strip(),
                "restaurant": {"id": p.restaurant_id, "name": p.restaurant.name} if p.restaurant else None,
            }
            for p in profiles.order_by("user__username")
        ])


class RestaurantDetailAPIView(RetrieveUpdateAPIView):
    """Edit a restaurant and its manager login, or enable/disable it."""
    permission_classes = [IsSuperAdmin]
    serializer_class = RestaurantUpdateSerializer
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        return restaurants_with_summary()
