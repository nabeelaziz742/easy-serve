from rest_framework import status
import logging as logger
from apps.core.models import ForgetPassword
from rest_framework.views import APIView
from apps.core.serializers import ResetPasswordSerializer
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from datetime import datetime, timedelta, timezone

User = get_user_model()


class ResetPasswordAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = ResetPasswordSerializer

    def post(self, request, secret_key):
        """
        """
        try:
            token = get_object_or_404(ForgetPassword, token=secret_key)
            if (token.created_at+timedelta(minutes=15)).replace(tzinfo=timezone.utc) < datetime.now(timezone.utc) - timedelta(minutes=15):
                token.activated = False
                token.is_expired = True
                token.save()
                return Response({"message": "Your token is expired"}, status=status.HTTP_400_BAD_REQUEST)
            if token.token == secret_key and token.activated and not token.is_expired:
                serializer = ResetPasswordSerializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                password = serializer.validated_data.get('password', None)
                token.user.set_password(password)
                token.user.save()
                token.delete()
                return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
            return Response({"message": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(str(e))
            return Response({"message": "Something went wrong."}, status.HTTP_406_NOT_ACCEPTABLE)
