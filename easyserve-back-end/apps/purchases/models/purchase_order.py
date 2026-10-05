from decimal import Decimal
from django.db import models
from coresite.mixin import AbstractTimeStampModel
from apps.purchases.constants import PurchaseStatus


class PurchaseOrder(AbstractTimeStampModel):
    """
    Purchase Order (Stock In) record.
    Tracks purchase lifecycle: DRAFT -> RECEIVED (or CANCELLED).
    Only moving to RECEIVED status impacts inventory balances and creates ledger movements.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='purchase_orders'
    )
    supplier = models.ForeignKey(
        'purchases.Supplier',
        on_delete=models.PROTECT,
        related_name='purchase_orders'
    )
    purchase_number = models.CharField(
        max_length=64,
        blank=True,
        help_text="Restaurant-unique purchase identifier, e.g. PO-000001"
    )
    invoice_number = models.CharField(
        max_length=128,
        blank=True,
        default='',
        help_text="Supplier's physical or electronic tax invoice reference"
    )
    purchase_date = models.DateField()
    status = models.PositiveSmallIntegerField(
        choices=PurchaseStatus.model_choices(),
        default=PurchaseStatus.DRAFT.value,
        db_index=True
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Calculated sum of all line item totals"
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Applicable sales tax or VAT"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Final gross payable: subtotal + tax_amount"
    )
    receipt_image = models.ImageField(
        upload_to='purchases/receipts/',
        null=True,
        blank=True,
        help_text="Scan or photo of paper receipt / supplier delivery challan"
    )
    notes = models.TextField(
        blank=True,
        default=''
    )
    created_by = models.ForeignKey(
        'userprofile.UserProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_purchase_orders'
    )
    received_by = models.ForeignKey(
        'userprofile.UserProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_purchase_orders'
    )
    received_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'purchase_orders'
        verbose_name = 'Purchase Order'
        verbose_name_plural = 'Purchase Orders'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'purchase_number'],
                name='unique_purchase_number_per_restaurant'
            )
        ]
        indexes = [
            models.Index(fields=['restaurant', 'status', 'purchase_date']),
            models.Index(fields=['restaurant', 'supplier']),
        ]
        ordering = ['-purchase_date', '-id']

    def __str__(self):
        return f"{self.purchase_number} - {self.supplier.name} ({self.get_status_display()})"
