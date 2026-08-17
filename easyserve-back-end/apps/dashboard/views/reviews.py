from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView

from apps.restaurants.serializers import ReviewCreateSerializer
from apps.restaurants.models import Review
from apps.dashboard.serializers import ReviewListSerializer


class ReviewListAPIView(ListAPIView):
    serializer_class = ReviewListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, "profile", None)
        if not profile:
            return Review.objects.none()

        # Super admins can inspect all restaurant feedback.
        if user.user_type == "super_admin":
            return Review.objects.select_related(
                "order__table", "user", "waiter"
            ).order_by("-created_at")

        # Managers/waiters are scoped to their assigned restaurant. Owners
        # fall back to their owned restaurant when no direct assignment is set.
        restaurant = getattr(profile, "restaurant", None)
        if restaurant is None:
            selected_restaurant = getattr(profile, "selected_restaurant", None)
            if selected_restaurant:
                restaurant = selected_restaurant

        if restaurant is None:
            restaurant = profile.owned_restaurants.first()

        if restaurant is None:
            return Review.objects.none()

        restaurant_id = getattr(restaurant, "id", restaurant)
        return Review.objects.filter(
            order__table__restaurant_id=restaurant_id
        ).select_related("order__table", "user", "waiter").order_by("-created_at")


class AddReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Review submitted successfully"},
            status=201,
        )
