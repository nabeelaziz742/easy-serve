from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny

User = get_user_model()


class AccountStatusAPIView(APIView):

    """ 
        Here you can check if email already exists or not
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        try:
            """
            Parameters:
                email
            """
            user = get_object_or_404(User, email=request.data['email'])
            if user.is_active:
                return Response({"message": True, "status": "200", "user_type": user.user_type}, status=status.HTTP_200_OK)
            return Response({'message': False, "status": "200", "user_type": user.user_type}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"message": str(e), "status": "500"}, status.HTTP_500_INTERNAL_SERVER_ERROR)
