from decimal import Decimal
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.expenses.constants import ExpenseStatus
from apps.expenses.models import Expense, ExpenseCategory
from apps.expenses.permissions import HasExpenseAccess
from apps.expenses.serializers import (
    ExpenseSerializer,
    ExpenseCreateUpdateSerializer,
    ExpenseVoidSerializer,
)
from apps.expenses.services import ExpenseService


class ExpensePagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD and operational endpoints for restaurant operating expenses.
    """
    serializer_class = ExpenseSerializer
    permission_classes = [HasExpenseAccess]
    pagination_class = ExpensePagination

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExpenseCreateUpdateSerializer
        return ExpenseSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Expense.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = ExpenseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return Expense.objects.none()

        qs = (
            Expense.objects
            .filter(restaurant=restaurant)
            .select_related('category', 'created_by__user', 'voided_by__user')
            .order_by('-expense_date', '-created_at')
        )

        # Filters
        category_id = self.request.query_params.get('category') or self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            qs = qs.filter(payment_method=payment_method)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(expense_date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(expense_date__lte=end_date)

        min_amount = self.request.query_params.get('min_amount')
        if min_amount:
            try:
                qs = qs.filter(amount__gte=Decimal(str(min_amount)))
            except (ValueError, TypeError):
                pass

        max_amount = self.request.query_params.get('max_amount')
        if max_amount:
            try:
                qs = qs.filter(amount__lte=Decimal(str(max_amount)))
            except (ValueError, TypeError):
                pass

        search = self.request.query_params.get('search')
        if search:
            search_clean = search.strip()
            qs = qs.filter(
                Q(title__icontains=search_clean) |
                Q(expense_number__icontains=search_clean) |
                Q(vendor_payee__icontains=search_clean) |
                Q(reference_number__icontains=search_clean) |
                Q(notes__icontains=search_clean) |
                Q(category__name__icontains=search_clean)
            )

        # Allow disabling pagination if explicitly requested (?no_paginate=true)
        if self.request.query_params.get('no_paginate') == 'true':
            self.pagination_class = None

        return qs

    def create(self, request, *args, **kwargs):
        user = request.user
        explicit_id = request.query_params.get('restaurant_id') or request.data.get('restaurant_id')
        restaurant = ExpenseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_profile = getattr(user, 'profile', None)
        expense = ExpenseService.create_expense(
            restaurant=restaurant,
            validated_data=serializer.validated_data,
            user_profile=user_profile
        )

        return Response(
            ExpenseSerializer(expense).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        expense = self.get_object()

        serializer = ExpenseCreateUpdateSerializer(expense, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        user_profile = getattr(request.user, 'profile', None)
        updated_expense = ExpenseService.update_expense(
            expense=expense,
            validated_data=serializer.validated_data,
            user_profile=user_profile
        )

        return Response(ExpenseSerializer(updated_expense).data)

    @action(detail=True, methods=['post'], url_path='void')
    def void(self, request, pk=None):
        expense = self.get_object()
        serializer = ExpenseVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_profile = getattr(request.user, 'profile', None)
        voided_expense = ExpenseService.void_expense(
            expense=expense,
            void_reason=serializer.validated_data['void_reason'],
            user_profile=user_profile
        )

        return Response({
            "message": f"Expense '{voided_expense.expense_number}' voided successfully.",
            "expense": ExpenseSerializer(voided_expense).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        user = request.user
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = ExpenseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        data = ExpenseService.get_expense_summary(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='breakdown')
    def breakdown(self, request):
        user = request.user
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = ExpenseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        data = ExpenseService.get_expense_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)
