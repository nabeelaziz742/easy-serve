import logging as logger
from rest_framework import status
from apps.core.models import UserActivation
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken


class AccountActivationAPIView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, secret_key):
        try:
            """
            This api is used to activate user account
            Parameters:
                secret_key

                """
            user_activation = get_object_or_404(
                UserActivation, token=secret_key,)
            print(user_activation.created_at + timedelta(minutes=3000000),"sdsdsds",timezone.now())
            if user_activation.created_at + timedelta(minutes=30) < timezone.now():
                return Response({"message": "Your activation token is expired."})


            if user_activation:
                if user_activation.user.is_active:
                    return Response({"message": "Account already activated", "status": "400"}, status=status.HTTP_400_BAD_REQUEST)
                if user_activation.token == secret_key and not user_activation.is_expired:
                    user_activation.user.is_active = True
                    user_activation.user.save()
                    user_activation.delete()

                    refresh = RefreshToken.for_user(user_activation.user)
                    access = str(refresh.access_token)

                    return Response({
                    "access": access,
                    "refresh": str(refresh),
                    "user_type": user_activation.user.user_type
                    }, status=status.HTTP_200_OK)
                return Response({"message": "Account already activated", "status": "400"}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"message": "Invalid token", "status": "400"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(str(e))
            return Response({"message": "User Not Found", "status": "406"}, status.HTTP_406_NOT_ACCEPTABLE)
