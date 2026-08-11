from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from apps.core.serializers import UserListSerializer, StaffUpdateSerializer

User = get_user_model()


class StaffListView(generics.ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_type = self.request.query_params.get('type', 'waiter')
        return User.objects.filter(user_type=user_type)


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return StaffUpdateSerializer
        return UserListSerializer