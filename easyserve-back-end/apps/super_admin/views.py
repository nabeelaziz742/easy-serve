from rest_framework.views import APIView
from rest_framework.response import Response

from utils.permissions import IsSuperAdmin


class OverviewMetricsAPIView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Replace with real queries
        data = {
            "total_restaurants": 16,
            "total_orders_today": 321,
            "revenue_today": 1251,
            "active_users": 541,
            "orders_trend": {
                "labels": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
                "data": [121,151,181,201,221,301,321]
            },
            "latest_restaurants": [
                {"id": 1, "name": "Cafe Blue", "plan": "Pro", "created": "2025-09-01"},
                {"id": 2, "name": "Spice Corner", "plan": "Starter", "created": "2025-09-03"},
            ],
            "recent_orders": [
                {"id": 1024, "restaurant": "Cafe Blue", "total": 25.99},
                {"id": 1023, "restaurant": "Spice Corner", "total": 15.50},
            ]
        }
        return Response(data)
