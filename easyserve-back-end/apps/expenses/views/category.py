from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.expenses.models import ExpenseCategory
from apps.expenses.permissions import HasExpenseAccess
from apps.expenses.serializers import ExpenseCategorySerializer
from apps.expenses.services import ExpenseService


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [HasExpenseAccess]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ExpenseCategory.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = ExpenseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return ExpenseCategory.objects.none()

        return (
            ExpenseCategory.objects
            .filter(restaurant=restaurant)
            .annotate(expense_count=Count('expenses'))
            .order_by('name')
        )

    def perform_create(self, serializer):
        user = self.request.user
        explicit_id = self.request.query_params.get('restaurant_id') or self.request.data.get('restaurant_id')
        restaurant = ExpenseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        name = serializer.validated_data.get('name', '').strip()
        if ExpenseCategory.objects.filter(restaurant=restaurant, name__iexact=name).exists():
            raise ValidationError(f"An expense category named '{name}' already exists for this restaurant.")

        serializer.save(restaurant=restaurant)

    def perform_update(self, serializer):
        category = self.get_object()
        name = serializer.validated_data.get('name', '').strip()
        if name:
            if ExpenseCategory.objects.filter(restaurant=category.restaurant, name__iexact=name).exclude(id=category.id).exists():
                raise ValidationError(f"An expense category named '{name}' already exists for this restaurant.")
        serializer.save()
