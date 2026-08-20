from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

User = get_user_model()


class AccountStatusAPIView(APIView):

    """
        Checks whether an email is already registered, for use inside the
        registration form's own validation flow.

        Deliberately does NOT reveal user_type or is_active, and does not
        distinguish "not found" from "inactive" in its response shape â€”
        both would let an unauthenticated caller enumerate which emails are
        registered and what role they hold (useful recon for phishing /
        credential-stuffing against high-value accounts). Rate-limited for
        the same reason.
    """
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"message": False, "status": "200"}, status=status.HTTP_200_OK)

        try:
            get_object_or_404(User, email=email, is_active=True)
            exists = True
        except Http404:
            exists = False

        return Response({"message": exists, "status": "200"}, status=status.HTTP_200_OK)
