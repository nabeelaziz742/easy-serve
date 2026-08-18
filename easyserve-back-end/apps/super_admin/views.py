from datetime import datetime, timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.core.models import User
from apps.restaurants.constants import PaymentStatus
from apps.restaurants.models import Restaurant, Orders
from utils.permissions import IsSuperAdmin


class OverviewMetricsAPIView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        today = timezone.localdate()
        start_of_today = timezone.make_aware(datetime.combine(today, datetime.min.time()))

        valid_orders = Orders.objects.filter(
            created_at__gte=start_of_today,
            ordered=True,
            order_cancelled=False,
        )

        total_orders_today = valid_orders.count()
        revenue_today = valid_orders.filter(
            payment_status=PaymentStatus.CONFIRMED.value
        ).aggregate(total=Sum("total_price"))["total"] or 0

        trend_labels = []
        trend_data = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            day_start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
            next_day_start = day_start + timedelta(days=1)
            trend_labels.append(day.strftime("%a"))
            trend_data.append(
                Orders.objects.filter(
                    created_at__gte=day_start,
                    created_at__lt=next_day_start,
                    ordered=True,
                    order_cancelled=False,
                ).count()
            )

        latest_restaurants = []
        for restaurant in Restaurant.objects.order_by("-created_at")[:5]:
            latest_restaurants.append({
                "id": restaurant.id,
                "name": restaurant.name,
                # Restaurant currently has no plan/subscription field.
                "plan": None,
                "created": restaurant.created_at.date().isoformat(),
            })

        recent_orders = []
        orders = Orders.objects.select_related(
            "table__restaurant",
            "dine_in_session__restaurant",
        ).filter(
            ordered=True,
            order_cancelled=False,
        ).order_by("-created_at")[:5]

        for order in orders:
            restaurant = None
            if order.table_id and order.table:
                restaurant = order.table.restaurant
            elif order.dine_in_session_id and order.dine_in_session:
                restaurant = order.dine_in_session.restaurant

            recent_orders.append({
                "id": order.id,
                "restaurant": restaurant.name if restaurant else None,
                "total": float(order.total_price),
            })

        data = {
            "total_restaurants": Restaurant.objects.count(),
            "total_orders_today": total_orders_today,
            "revenue_today": float(revenue_today),
            "active_users": User.objects.filter(is_active=True).count(),
            "orders_trend": {
                "labels": trend_labels,
                "data": trend_data,
            },
            "latest_restaurants": latest_restaurants,
            "recent_orders": recent_orders,
        }
        return Response(data)
