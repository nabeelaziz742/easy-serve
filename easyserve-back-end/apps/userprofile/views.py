from decimal import InvalidOperation, Decimal

from django.db.models import Q
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from .models import UserProfile
from rest_framework import filters, status
from utils.paginations.pagination import LimitOffsetPagination
from django_filters import rest_framework as backend_filters
from .filters import UserProfileFilter
from utils.permissions import IsSuperAdminOrReadOnly, IsSuperAdmin, IsRestaurantOwner
from .serializers import UserProfileSerializer, UserProfileWriteSerializer, NotificationSerializer, \
    SelectedRestaurantSerializer
from utils.notifications import create_notification
from ..restaurants.models import Restaurant
from ..restaurants.serializers import RestaurantLiteSerializer


class UserProfileViewSet(ModelViewSet):
    permission_classes = [IsSuperAdminOrReadOnly]
    pagination_class = LimitOffsetPagination
    filter_backends = [
        backend_filters.DjangoFilterBackend,
        filters.SearchFilter,
    ]
    filterset_class = UserProfileFilter
    search_fields = ['first_name', 'last_name', 'user__username']
    queryset = UserProfile.objects.all()
    lookup_field = 'user__username'
    lookup_url_kwarg = 'username'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserProfileWriteSerializer
        return UserProfileSerializer

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser or getattr(user, "is_super_admin", False):
            return self.queryset.filter(user__is_active=True)

        if self.action in ['list', 'retrieve']:
            return self.queryset.filter(user__is_active=True)
        return self.queryset.filter(user__is_active=True, user=self.request.user)

    # ✅ Notification when a new profile is created
    def perform_create(self, serializer):
        instance = serializer.save()
        create_notification(
            self.request.user.profile,
            # "Profile Created",
            f"Profile for user '{instance.user.username}' has been created successfully."
        )

    # ✅ Notification when a profile is updated
    def perform_update(self, serializer):
        instance = serializer.save()
        create_notification(
            self.request.user.profile,
            # "Profile Updated",
            f"Profile for user '{instance.user.username}' has been updated."
        )


    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin], url_path='owners-lite')
    def owners_lite(self, request):
        qs = (
            UserProfile.objects
            .only('id', 'user__username')
            .order_by('user__username')
            .filter(user__user_type="restaurant_owner")
        )

        search_query = request.query_params.get('search')
        if search_query:
            qs = qs.filter(Q(user__username__icontains=search_query))[:10]
        else:
            qs = qs[:10]

        data = [{"id": o.id, "username": o.user.username} for o in qs]
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin], url_path='waiters-lite')
    def waiters_lite(self, request):
        qs = (
            UserProfile.objects
            .only('id', 'user__username').
            order_by('user__username')
            .filter(user__user_type="waiter")
        )

        search_query = request.query_params.get('search')
        if search_query:
            qs = qs.filter(Q(user__username__icontains=search_query))[:10]
        else:
            qs = qs[:10]

        data = [{"id": o.id, "username": o.user.username} for o in qs]
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='notifications')
    def notifications(self, request):
        """
        Returns all notifications for the logged-in user's profile.
        """
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response({"detail": "Profile not found."}, status=404)

        notifications = profile.notifications.all()
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated], url_path='notifications/(?P<pk>[^/.]+)/mark-as-read')
    def mark_as_read(self, request, pk=None):
        """
        Marks a specific notification as read for the logged-in user's profile.
        """
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response({"detail": "Profile not found."}, status=404)

        notification = profile.notifications.filter(pk=pk).first()
        if not notification:
            return Response({"detail": "Notification not found."}, status=404)

        notification.read = True
        notification.save()

        serializer = NotificationSerializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='owned-restaurants')
    def owned_restaurants(self, request):
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response({"detail": "Profile not found."}, status=404)

        owned_restaurants = profile.owned_restaurants.all()
        if not owned_restaurants:
            return Response([], status=200)

        serializer = RestaurantLiteSerializer(owned_restaurants, many=True)
        return Response(serializer.data)

class SelectedRestaurantAPIView(APIView):
    permission_classes = [IsRestaurantOwner]

    def post(self, request, *args, **kwargs):
        selected_restaurant = request.data.get('selected_restaurant')
        if selected_restaurant in (None, '', []):
            return Response({"detail": "No selected_restaurant provided."}, status=status.HTTP_400_BAD_REQUEST)

        # coerce to int (and to Decimal for the model)
        try:
            selected_id = int(selected_restaurant)
        except (ValueError, TypeError):
            return Response({"detail": "selected_restaurant must be an integer id."}, status=status.HTTP_400_BAD_REQUEST)

        # ensure restaurant exists
        try:
            restaurant = Restaurant.objects.get(id=selected_id)
        except Restaurant.DoesNotExist:
            return Response({"detail": "Restaurant not found."}, status=status.HTTP_404_NOT_FOUND)

        # ensure the requesting user is an owner of that restaurant
        # adjust the ownership check to match your Restaurant/owners relation
        # if Restaurant.owners is a ManyToMany of UserProfile instances:
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "User profile not found."}, status=status.HTTP_400_BAD_REQUEST)

        # check ownership: adjust if your relation uses user or userprofile differently
        is_owner = restaurant.owners.filter(id=profile.id).exists()
        if not is_owner:
            return Response({"detail": "You do not own this restaurant."}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile.selected_restaurant = int(selected_id)
            profile.save(update_fields=['selected_restaurant'])
        except (InvalidOperation, ValueError) as e:
            return Response({"detail": "Failed to save selected restaurant."}, status=status.HTTP_400_BAD_REQUEST)

        # Return the stored value
        serializer = SelectedRestaurantSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get(self, request, *args, **kwargs):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "User profile not found."}, status=status.HTTP_400_BAD_REQUEST)

        if profile.selected_restaurant in (None, ''):
            return Response({"detail": "No restaurant selected."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SelectedRestaurantSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)