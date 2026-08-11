from datetime import date
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from apps.core.models import UserActivation
from apps.core.serializers import ResendEmailSerializer
from apps.core.utils.reset_email_token_util import reset_email_token
from utils.threads.email_thread import send_mail
from django.contrib.auth import get_user_model

User = get_user_model()
domain = settings.DOMAIN


class ResendActivationAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = ResendEmailSerializer

    def post(self, request, *args, **kwargs):
        try:
            serializer = ResendEmailSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            email = serializer.validated_data.get('email', None)
            user = get_object_or_404(User, user__email=email)
            if user.is_active:
                return Response({"message": "Account already activated"},
                                status=status.HTTP_400_BAD_REQUEST)
            user_activation = user.user_activation
            if user_activation:
                user_activation.delete()
            secret_key = reset_email_token(50)
            UserActivation.objects.create(
                user=user, secret_key=secret_key)
            key = {
                'username': user.username,
                'otp': None,
                'button': domain + '/api/user/account-activation/' + secret_key,
                'year': date.today().year
            }

            subject = "Verify Your Account"
            template_name = "auth/new_userRegister.html"
            recipient = [email]

            send_mail(subject=subject, html_content=template_name,
                      recipient_list=recipient, key=key)

            return Response({"message": "New OTP sent successfully. Check your email for verification"},
                            status=status.HTTP_200_OK)
        except UserActivation.DoesNotExist:
            return Response({"message": "User not found or account already activated"},
                            status=status.HTTP_400_BAD_REQUEST)
