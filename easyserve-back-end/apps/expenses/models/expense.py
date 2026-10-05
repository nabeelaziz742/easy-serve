from decimal import Decimal
from django.db import models
from django.utils import timezone
from coresite.mixin import AbstractTimeStampModel
from apps.expenses.constants import ExpensePaymentMethod, ExpenseStatus


class Expense(AbstractTimeStampModel):
    """
    Operating Expense record for restaurant overhead, utilities, payroll, and maintenance.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='expenses',
        db_index=True
    )
    category = models.ForeignKey(
        'expenses.ExpenseCategory',
        on_delete=models.PROTECT,
        related_name='expenses',
        db_index=True
    )
    expense_number = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Human-readable business identifier, e.g. EXP-2026-000001."
    )
    title = models.CharField(max_length=255, help_text="Short description of the expense.")
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Monetary value in PKR / local currency."
    )
    expense_date = models.DateField(
        default=timezone.now,
        db_index=True,
        help_text="The actual date on which the expense occurred."
    )
    payment_method = models.PositiveSmallIntegerField(
        choices=ExpensePaymentMethod.model_choices(),
        default=ExpensePaymentMethod.CASH.value,
        db_index=True
    )
    vendor_payee = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Recipient, supplier, contractor, or utility authority."
    )
    reference_number = models.CharField(
        max_length=120,
        blank=True,
        default='',
        help_text="External invoice number, cheque ref, or transaction ID."
    )
    notes = models.TextField(blank=True, default='', help_text="Detailed audit notes.")
    receipt = models.FileField(
        upload_to='expense_receipts/',
        null=True,
        blank=True,
        help_text="Optional scanned bill, receipt, or invoice."
    )
    status = models.PositiveSmallIntegerField(
        choices=ExpenseStatus.model_choices(),
        default=ExpenseStatus.ACTIVE.value,
        db_index=True
    )
    void_reason = models.TextField(blank=True, default='', help_text="Mandatory explanation if voided.")
    voided_by = models.ForeignKey(
        'userprofile.UserProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voided_expenses'
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'userprofile.UserProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_expenses'
    )

    class Meta:
        db_table = 'expenses'
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['restaurant', 'expense_date']),
            models.Index(fields=['restaurant', 'status']),
            models.Index(fields=['restaurant', 'category']),
            models.Index(fields=['restaurant', 'payment_method']),
        ]

    def save(self, *args, **kwargs):
        if not self.expense_number:
            super().save(*args, **kwargs)
            year = self.expense_date.year if self.expense_date else timezone.now().year
            self.expense_number = f"EXP-{year}-{self.id:06d}"
            return super().save(update_fields=['expense_number'])
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.expense_number or 'EXP'}: {self.title} - Rs. {self.amount} ({self.get_status_display()})"
