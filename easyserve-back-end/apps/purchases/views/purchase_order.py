from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q

from apps.purchases.models import PurchaseOrder
from apps.purchases.constants import PurchaseStatus
from apps.purchases.serializers import (
    PurchaseOrderListSerializer,
    PurchaseOrderDetailSerializer,
    PurchaseOrderCreateUpdateSerializer,
)
from apps.purchases.permissions import HasPurchasesAccess
from apps.purchases.services import PurchaseService


class PurchaseOrderViewSet(ModelViewSet):
    permission_classes = [HasPurchasesAccess]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PurchaseOrderDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseOrderCreateUpdateSerializer
        return PurchaseOrderListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        restaurant_id = None
        if hasattr(self, 'request') and self.request:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if not restaurant_id and hasattr(self.request, 'data') and isinstance(self.request.data, dict):
                restaurant_id = self.request.data.get('restaurant_id')
        restaurant = PurchaseService.resolve_user_restaurant(
            getattr(self.request, 'user', None),
            restaurant_id
        )
        ctx['restaurant'] = restaurant
        return ctx

    def _get_target_restaurant(self):
        restaurant_id = None
        if hasattr(self, 'request') and self.request:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if not restaurant_id and hasattr(self.request, 'data') and isinstance(self.request.data, dict):
                restaurant_id = self.request.data.get('restaurant_id')
        restaurant = PurchaseService.resolve_user_restaurant(self.request.user, restaurant_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")
        return restaurant

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return PurchaseOrder.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = PurchaseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return PurchaseOrder.objects.none()

        qs = (
            PurchaseOrder.objects
            .filter(restaurant=restaurant)
            .select_related('supplier', 'created_by__user', 'received_by__user')
            .prefetch_related('items', 'items__inventory_item', 'items__inventory_item__uom')
            .order_by('-purchase_date', '-id')
        )

        # Filters
        status_param = self.request.query_params.get('status')
        if status_param:
            try:
                status_val = int(status_param)
                qs = qs.filter(status=status_val)
            except (ValueError, TypeError):
                # Allow string matching like "draft", "received", "cancelled"
                status_lower = status_param.lower()
                if status_lower == 'draft':
                    qs = qs.filter(status=PurchaseStatus.DRAFT.value)
                elif status_lower == 'received':
                    qs = qs.filter(status=PurchaseStatus.RECEIVED.value)
                elif status_lower == 'cancelled':
                    qs = qs.filter(status=PurchaseStatus.CANCELLED.value)

        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)

        invoice_number = self.request.query_params.get('invoice_number')
        if invoice_number:
            qs = qs.filter(invoice_number__icontains=invoice_number.strip())

        purchase_number = self.request.query_params.get('purchase_number')
        if purchase_number:
            qs = qs.filter(purchase_number__icontains=purchase_number.strip())

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(purchase_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(purchase_date__lte=date_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(purchase_number__icontains=search) |
                Q(invoice_number__icontains=search) |
                Q(supplier__name__icontains=search) |
                Q(notes__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        restaurant = self._get_target_restaurant()
        user_profile = getattr(request.user, 'profile', None)

        serializer = self.get_serializer(data=request.data, context={'restaurant': restaurant, 'request': request})
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        items_data = validated_data.pop('items')
        supplier = validated_data.pop('supplier_id')
        validated_data['supplier'] = supplier

        po = PurchaseService.create_purchase_order(
            restaurant=restaurant,
            user_profile=user_profile,
            validated_data=validated_data,
            items_data=items_data
        )

        detail_serializer = PurchaseOrderDetailSerializer(po, context={'restaurant': restaurant, 'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        restaurant = self._get_target_restaurant()
        user_profile = getattr(request.user, 'profile', None)

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=kwargs.get('partial', False),
            context={'restaurant': restaurant, 'request': request}
        )
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        items_data = validated_data.pop('items', None)
        if 'supplier_id' in validated_data:
            supplier = validated_data.pop('supplier_id')
            validated_data['supplier'] = supplier

        po = PurchaseService.update_purchase_order(
            purchase_order=instance,
            user_profile=user_profile,
            validated_data=validated_data,
            items_data=items_data
        )

        detail_serializer = PurchaseOrderDetailSerializer(po, context={'restaurant': restaurant, 'request': request})
        return Response(detail_serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == PurchaseStatus.RECEIVED.value:
            raise ValidationError("Received purchase orders cannot be deleted to preserve stock audit integrity.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='receive')
    def receive(self, request, pk=None):
        instance = self.get_object()
        restaurant = self._get_target_restaurant()
        user_profile = getattr(request.user, 'profile', None)

        po = PurchaseService.receive_purchase_order(
            purchase_order_id=instance.id,
            restaurant=restaurant,
            user_profile=user_profile
        )

        detail_serializer = PurchaseOrderDetailSerializer(po, context={'restaurant': restaurant, 'request': request})
        return Response({
            "message": f"Purchase Order {po.purchase_number} received successfully. Stock and weighted average costs updated.",
            "purchase_order": detail_serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        instance = self.get_object()
        restaurant = self._get_target_restaurant()
        user_profile = getattr(request.user, 'profile', None)

        po = PurchaseService.cancel_purchase_order(
            purchase_order_id=instance.id,
            restaurant=restaurant,
            user_profile=user_profile
        )

        detail_serializer = PurchaseOrderDetailSerializer(po, context={'restaurant': restaurant, 'request': request})
        return Response({
            "message": f"Purchase Order {po.purchase_number} cancelled.",
            "purchase_order": detail_serializer.data
        }, status=status.HTTP_200_OK)
