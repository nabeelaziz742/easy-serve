from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.core.serializers import UserListSerializer, StaffUpdateSerializer, StaffCreateSerializer
from apps.userprofile.models import UserProfile
from apps.restaurants.permissions import IsManager

User = get_user_model()


def _get_manager_restaurant(user):
    if user.is_superuser or getattr(user, 'user_type', None) == 'super_admin':
        return None
    profile = getattr(user, 'profile', None)
    if profile is None:
        return None
    if profile.restaurant:
        return profile.restaurant
    if profile.selected_restaurant:
        from apps.restaurants.models import Restaurant
        rest = Restaurant.objects.filter(id=profile.selected_restaurant).first()
        if rest:
            return rest
    return profile.owned_restaurants.first()


class StaffListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StaffCreateSerializer
        return UserListSerializer

    def get_queryset(self):
        user = self.request.user
        user_type = self.request.query_params.get('type', 'waiter')
        if user.is_superuser or getattr(user, 'user_type', None) == 'super_admin':
            return User.objects.filter(user_type=user_type).select_related('profile').order_by('id')

        restaurant = _get_manager_restaurant(user)
        if restaurant is None:
            return User.objects.none()

        return User.objects.filter(
            user_type=user_type,
            profile__restaurant=restaurant
        ).select_related('profile').order_by('id')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = _get_manager_restaurant(request.user)
        is_super = request.user.is_superuser or getattr(request.user, 'user_type', None) == 'super_admin'

        if restaurant is None and not is_super:
            return Response(
                {"detail": "You are not assigned to any restaurant. Cannot create staff."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if is_super and restaurant is None:
            rest_id = request.data.get('restaurant_id')
            if rest_id:
                from apps.restaurants.models import Restaurant
                restaurant = Restaurant.objects.filter(id=rest_id).first()

        if User.objects.filter(username=data['username']).exists():
            return Response({"detail": "A user with this username already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=data['email']).exists():
            return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=data['email'],
            username=data['username'],
            password=data['password'],
            user_type=data['user_type'],
            is_active=True,
        )
        user.is_active = True
        user.save(update_fields=['is_active'])

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.restaurant = restaurant
        profile.first_name = data.get('first_name', '')
        profile.last_name = data.get('last_name', '')
        profile.phone = data.get('phone', '')
        profile.save()

        return Response(UserListSerializer(user).data, status=status.HTTP_201_CREATED)


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or getattr(user, 'user_type', None) == 'super_admin':
            return User.objects.all().select_related('profile').order_by('id')

        restaurant = _get_manager_restaurant(user)
        if restaurant is None:
            return User.objects.none()

        return User.objects.filter(profile__restaurant=restaurant).select_related('profile').order_by('id')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return StaffUpdateSerializer
        return UserListSerializer