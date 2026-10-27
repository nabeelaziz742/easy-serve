from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import DineInSessionStatus
from apps.restaurants.models import DineInSession, ServiceRequest
from apps.restaurants.services.dine_in_guest import get_dine_in_token
from apps.restaurants.services.order_access import staff_restaurant_ids

STAFF_ROLES = ("waiter", "manager", "restaurant_owner", "super_admin")


def serialize_request(service_request):
    return {
        "id": service_request.id,
        "kind": service_request.kind,
        "kind_label": service_request.get_kind_display(),
        "table_number": service_request.table.table_number,
        "guest_name": service_request.dine_in_session.name or "",
        "created_at": service_request.created_at,
        "resolved_at": service_request.resolved_at,
    }


def open_requests():
    return ServiceRequest.objects.filter(
        resolved_at__isnull=True,
        dine_in_session__status=DineInSessionStatus.ACTIVE.value,
    ).select_related("table", "dine_in_session")


class GuestServiceRequestAPIView(APIView):
    """The guest at a table calls the waiter or asks for the bill.

    The table session token (sent by the guest's browser) proves the
    request comes from the people at that table. Pressing the button again
    while a request is still open does not create a second alert.
    """
    permission_classes = [AllowAny]

    def _active_session(self, request):
        token = get_dine_in_token(request)
        if not token:
            return None
        return (
            DineInSession.objects.select_related("table", "restaurant")
            .filter(token=token, status=DineInSessionStatus.ACTIVE.value)
            .first()
        )

    def get(self, request):
        session = self._active_session(request)
        if session is None:
            return Response({"active": False, "results": []})
        requests = open_requests().filter(dine_in_session=session)
        return Response({"active": True, "results": [serialize_request(r) for r in requests]})

    @transaction.atomic
    def post(self, request):
        session = self._active_session(request)
        if session is None:
            return Response(
                {"detail": "Your table session has ended. Please scan the table QR code again."},
                status=status.HTTP_403_FORBIDDEN,
            )

        kind = request.data.get("kind")
        if kind not in ServiceRequest.Kind.values:
            return Response({"detail": "Unknown request."}, status=status.HTTP_400_BAD_REQUEST)

        # Lock the session row so two quick taps cannot both create one.
        DineInSession.objects.select_for_update().filter(id=session.id).first()
        existing = open_requests().filter(dine_in_session=session, kind=kind).first()
        if existing:
            return Response(serialize_request(existing), status=status.HTTP_200_OK)

        service_request = ServiceRequest.objects.create(
            dine_in_session=session,
            restaurant=session.restaurant,
            table=session.table,
            kind=kind,
        )
        return Response(serialize_request(service_request), status=status.HTTP_201_CREATED)


class StaffServiceRequestListAPIView(APIView):
    """Open table requests in the staff member's restaurant, oldest first."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.user_type not in STAFF_ROLES:
            return Response({"detail": "Only restaurant staff can see table requests."}, status=status.HTTP_403_FORBIDDEN)
        requests = open_requests()
        if user.user_type != "super_admin":
            requests = requests.filter(restaurant_id__in=staff_restaurant_ids(user))
        return Response({"results": [serialize_request(r) for r in requests]})


class ResolveServiceRequestAPIView(APIView):
    """A waiter marks a table request as handled."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if user.user_type not in STAFF_ROLES:
            return Response({"detail": "Only restaurant staff can handle table requests."}, status=status.HTTP_403_FORBIDDEN)
        service_request = get_object_or_404(ServiceRequest.objects.select_related("table", "dine_in_session"), id=pk)
        if user.user_type != "super_admin" and service_request.restaurant_id not in staff_restaurant_ids(user):
            return Response({"detail": "This request belongs to another restaurant."}, status=status.HTTP_403_FORBIDDEN)

        if service_request.resolved_at is None:
            service_request.resolved_at = timezone.now()
            service_request.resolved_by = user.profile
            service_request.save(update_fields=["resolved_at", "resolved_by", "updated_at"])
        return Response(serialize_request(service_request))
