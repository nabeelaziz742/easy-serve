from datetime import timedelta

from django.db.models import Sum
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.response import Response

from utils.permissions import IsSuperAdmin
from apps.restaurants.models import Restaurant, Orders
from apps.restaurants.constants import PaymentStatus
from apps.core.models.user import User


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
