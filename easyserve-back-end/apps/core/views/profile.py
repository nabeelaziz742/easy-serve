from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = user.profile
        except:
            profile = None

        return Response({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "user_type": user.user_type,
            "first_name": profile.first_name if profile else "",
            "last_name": profile.last_name if profile else "",
            "phone": profile.phone if profile else "",
            "image": request.build_absolute_uri(profile.image.url) if profile and profile.image else None,
        })