from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from apps.purchases.models import Supplier
from apps.purchases.serializers import SupplierSerializer
from apps.purchases.permissions import HasPurchasesAccess
from apps.purchases.services import PurchaseService


class SupplierViewSet(ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [HasPurchasesAccess]
    pagination_class = None

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
            return Supplier.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = PurchaseService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return Supplier.objects.none()

        qs = Supplier.objects.filter(restaurant=restaurant).order_by('name')

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            if is_active_param.lower() in ['true', '1']:
                qs = qs.filter(is_active=True)
            elif is_active_param.lower() in ['false', '0']:
                qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_person__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        restaurant = self._get_target_restaurant()
        serializer.save(restaurant=restaurant)

    def perform_destroy(self, instance):
        # If historical purchase orders exist, protect records and soft deactivate
        if instance.purchase_orders.exists():
            instance.is_active = False
            instance.save(update_fields=['is_active', 'updated_at'])
        else:
            instance.delete()
