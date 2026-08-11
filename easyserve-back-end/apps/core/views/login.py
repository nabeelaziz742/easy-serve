from rest_framework_simplejwt.views import TokenObtainPairView
from apps.core.serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
