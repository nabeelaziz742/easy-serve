from datetime import date
from django.conf import settings
from rest_framework import status, permissions
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from utils.threads.email_thread import send_mail
from apps.core.models import UserActivation
from apps.core.serializers import CreateUserSerializer
from apps.userprofile.serializers import UserProfileSerializer
from apps.core.utils.reset_email_token_util import reset_email_token

User = get_user_model()
react_domain = settings.REACT_DOMAIN


class RegistrationView(APIView):
    """Register and login api instant """

    permission_classes = (permissions.AllowAny,)
    serializer_class = CreateUserSerializer

    @swagger_auto_schema(
        operation_summary="Register new user",
        operation_description="Creates a new user and sends an account verification email.",
        request_body=CreateUserSerializer,
        responses={
            201: openapi.Response(
                description="Created",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(
                            type=openapi.TYPE_STRING,
                            example="User created successfully. Check your email for verification"
                        )
                    }
                )
            ),
            400: openapi.Response(description="Validation error")
        },
        security=[],
    )
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.validated_data.pop('profile', None)
        serializer.save()
        instance = serializer.instance

        if profile:
            profile_serializer = UserProfileSerializer(data=profile)
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save(user=instance)
        else:
            # No profile payload sent (e.g. manager "Add Waiter/Chef" form).
            # Every User must have a UserProfile - endpoints like order
            # accept/assign rely on request.user.profile and crash with a
            # 500 if it doesn't exist.
            from apps.userprofile.models import UserProfile
            UserProfile.objects.get_or_create(user=instance)

        # Manager-added staff (waiter/chef) - turant active, email verification skip
        if instance.user_type in ['waiter', 'chef']:
            instance.is_active = True
            instance.save()

            return Response({
                "message": f"{instance.user_type.capitalize()} added successfully!"
            }, status=status.HTTP_201_CREATED)

        secret_key = reset_email_token(50)
        UserActivation(user=instance, token=secret_key).save()

        key = {
            'username': instance.username,
            'otp': None,
            'button': react_domain + '/auth/account-activation/' + secret_key,
            'year': date.today().year
        }

        subject = "Verify Your Account"
        template_name = "auth/new_userRegister.html"
        recipient = [request.data['email']]

        send_mail(subject=subject, html_content=template_name,
                  recipient_list=recipient, key=key)

        return Response({
            "message": "User created successfully. Check your email for verification"
        }, status=status.HTTP_201_CREATED)