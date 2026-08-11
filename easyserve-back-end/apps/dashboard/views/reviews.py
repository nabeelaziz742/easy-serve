from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.restaurants.serializers import ReviewCreateSerializer
from rest_framework.generics import ListAPIView
from apps.restaurants.models import Review
from apps.dashboard.serializers import ReviewListSerializer


class ReviewListAPIView(ListAPIView):
    serializer_class = ReviewListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if not profile or not user.user_type == 'waiter' or not profile.restaurant:
            return Review.objects.none()

        return Review.objects.filter(
            order__table__restaurant=profile.restaurant
        ).select_related("order__table").order_by("-created_at")

class AddReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Review submitted successfully"}, status=201)
