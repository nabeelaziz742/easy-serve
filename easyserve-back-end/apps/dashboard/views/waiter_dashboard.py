from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.dashboard.services import WaiterDashboardService


class WaiterDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = WaiterDashboardService.get_waiter_dashboard(request.user, request)
        return Response(data)
