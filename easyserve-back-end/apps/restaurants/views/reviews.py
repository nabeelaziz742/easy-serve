from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from apps.restaurants.serializers import ReviewSerializer, CreateReviewSerializer
from apps.restaurants.models import Review


class ReviewViewSet(ModelViewSet):
    queryset = Review.objects.all().select_related('user', 'order')
    permission_classes = [IsAuthenticated]


    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CreateReviewSerializer
        return ReviewSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user.profile)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Review.objects.all().select_related('user', 'order')
        return Review.objects.filter(user=user.profile).select_related('user', 'order')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": f"Review {instance.id} deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )
