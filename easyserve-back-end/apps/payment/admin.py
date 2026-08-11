from apps.payment.models import Payment
from django.contrib import admin


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'method', 'status', 'paid_at')
    list_display_links = ('order', 'method', 'status')
    search_fields = ('order__user__first_name', 'order__user__last_name', 'method', 'status')
    list_filter = ('paid_at', 'method', 'status')
    ordering = ('-paid_at',)
