from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from django.db.models import Avg, Count
from apps.userprofile.models import UserProfile
from apps.ratings.models import RestaurantRating
from apps.ratings.serializers import RestaurantReviewSerializer

from apps.ratings.serializers import (
    RestaurantRatingSerializer,
    MenuItemRatingSerializer
)
from apps.ratings.services.rating_service import RatingService


class RateRestaurantAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RestaurantRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        RatingService.rate_restaurant(
            user=request.user,
            restaurant_id=serializer.validated_data["restaurant_id"],
            rating=serializer.validated_data["rating"],
            review=serializer.validated_data.get("review")
        )

        return Response({"message": "Restaurant rated successfully!"})


class RateMenuItemAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MenuItemRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        RatingService.rate_menu_item(
            user=request.user,
            item_id=serializer.validated_data["menu_item_id"],
            rating=serializer.validated_data["rating"],
            review=serializer.validated_data.get("review")
        )

        return Response({"message": "Menu item rated successfully!"})


class RestaurantReviewsAPIView(generics.ListAPIView):
    serializer_class = RestaurantReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        restaurant = None
        try:
            profile = UserProfile.objects.get(user=self.request.user)
            restaurant = profile.owned_restaurants.first()
        except UserProfile.DoesNotExist:
            pass

        if not restaurant:
            return RestaurantRating.objects.none()

        return RestaurantRating.objects.filter(
            restaurant=restaurant
        ).select_related('user').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        stats = queryset.aggregate(avg_rating=Avg('rating'), total=Count('id'))
        five_star = queryset.filter(rating=5).count()

        return Response({
            "average_rating": round(stats['avg_rating'] or 0, 1),
            "total_reviews": stats['total'] or 0,
            "five_star_reviews": five_star,
            "reviews": serializer.data,
        })