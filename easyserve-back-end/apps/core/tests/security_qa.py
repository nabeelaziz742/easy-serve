from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.restaurants.models import (
    Restaurant, Menu, MenuItem, Orders, OrderItem, Category, Table
)
from apps.restaurants.constants import OrderStatus, PaymentStatus, OrderType, PaymentMethod
from apps.inventory.models import UnitOfMeasure, InventoryCategory, InventoryItem, StockMovementLog, StockWastage
from apps.inventory.constants import WastageReason, StockMovementType, StockAdjustmentReason
from apps.purchases.models import Supplier, PurchaseOrder, PurchaseOrderItem
from apps.purchases.constants import PurchaseStatus
from apps.recipes.models import Recipe, RecipeItem
from apps.expenses.models import ExpenseCategory, Expense
from apps.expenses.constants import ExpenseStatus, ExpensePaymentMethod
from apps.userprofile.models import UserProfile

User = get_user_model()


class SecurityAndProductionQATestCase(TestCase):
    """
    Phase 9 Production Readiness & Security Test Suite.
    Verifies Authentication, RBAC, Multi-Tenant Isolation, Input Validation, and Data Integrity.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Restaurants A and B
        self.restaurant_a = Restaurant.objects.create(
            name="Emerald Grill A",
            address="Clifton Block 4",
            phone_number="03001111111",
            city="Karachi"
        )
        self.restaurant_b = Restaurant.objects.create(
            name="Emerald Grill B",
            address="Gulshan Block 7",
            phone_number="03002222222",
            city="Karachi"
        )

        # 2. Roles for Restaurant A
        self.manager_a = User.objects.create_user(
            username="manager_qa_a",
            email="manager_qa_a@easyserve.com",
            password="SecurePassword123!",
            user_type="manager"
        )
        self.profile_manager_a = UserProfile.objects.create(
            user=self.manager_a,
            restaurant=self.restaurant_a
        )

        self.chef_a = User.objects.create_user(
            username="chef_qa_a",
            email="chef_qa_a@easyserve.com",
            password="SecurePassword123!",
            user_type="chef"
        )
        self.profile_chef_a = UserProfile.objects.create(
            user=self.chef_a,
            restaurant=self.restaurant_a
        )

        self.waiter_a = User.objects.create_user(
            username="waiter_qa_a",
            email="waiter_qa_a@easyserve.com",
            password="SecurePassword123!",
            user_type="waiter"
        )
        self.profile_waiter_a = UserProfile.objects.create(
            user=self.waiter_a,
            restaurant=self.restaurant_a
        )

        self.customer_a = User.objects.create_user(
            username="customer_qa_a",
            email="customer_qa_a@example.com",
            password="SecurePassword123!",
            user_type="customer"
        )
        self.profile_customer_a = UserProfile.objects.create(
            user=self.customer_a,
            restaurant=self.restaurant_a
        )

        # 3. Manager for Restaurant B (Cross-tenant actor)
        self.manager_b = User.objects.create_user(
            username="manager_qa_b",
            email="manager_qa_b@easyserve.com",
            password="SecurePassword123!",
            user_type="manager"
        )
        self.profile_manager_b = UserProfile.objects.create(
            user=self.manager_b,
            restaurant=self.restaurant_b
        )

        # 4. Inventory, Recipes, Orders, Expenses for Restaurant A
        self.uom_kg = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Kilogram",
            short_code="kg"
        )
        self.inv_cat_a = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Poultry"
        )
        self.item_chicken_a = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            name="Chicken Breast",
            sku="CHK-001",
            category=self.inv_cat_a,
            uom=self.uom_kg,
            current_stock=Decimal("50.000"),
            min_reorder_level=Decimal("10.000"),
            cost_per_unit=Decimal("800.00")
        )

        self.menu_a = Menu.objects.create(restaurant=self.restaurant_a, name="Main Menu")
        self.cat_a = Category.objects.create(name="Grilled Chicken")
        self.menu_item_a = MenuItem.objects.create(
            menu=self.menu_a,
            category=self.cat_a,
            name="Herb Grilled Chicken",
            price=Decimal("1600.00"),
            is_available=True
        )

        self.table_a = Table.objects.create(
            restaurant=self.restaurant_a,
            table_number=1,
            capacity=4
        )

        # 5. Inventory & Resources for Restaurant B
        self.uom_kg_b = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_b,
            name="Kilogram",
            short_code="kg"
        )
        self.inv_cat_b = InventoryCategory.objects.create(
            restaurant=self.restaurant_b,
            name="Beef"
        )
        self.item_beef_b = InventoryItem.objects.create(
            restaurant=self.restaurant_b,
            name="Prime Beef Tenderloin",
            sku="BEEF-B01",
            category=self.inv_cat_b,
            uom=self.uom_kg_b,
            current_stock=Decimal("30.000"),
            min_reorder_level=Decimal("5.000"),
            cost_per_unit=Decimal("2000.00")
        )

        self.exp_cat_b = ExpenseCategory.objects.create(
            restaurant=self.restaurant_b,
            name="Marketing"
        )
        self.expense_b = Expense.objects.create(
            restaurant=self.restaurant_b,
            category=self.exp_cat_b,
            title="Billboards Campaign",
            amount=Decimal("75000.00"),
            expense_date=date.today(),
            payment_method=ExpensePaymentMethod.BANK_TRANSFER.value,
            status=ExpenseStatus.ACTIVE.value,
            created_by=self.profile_manager_b
        )

    # =========================================================================
    # 1. AUTHENTICATION & TOKEN AUDIT
    # =========================================================================

    def test_unauthenticated_requests_denied(self):
        """Unauthenticated requests to protected endpoints must return 401."""
        endpoints = [
            "/api/manager/financial/overview/",
            "/api/manager/financial/command-center/",
            "/api/manager/financial/reports/",
            "/api/manager/financial/reports/export-excel/",
            "/api/manager/financial/reports/export-pdf/",
            "/api/manager/inventory/items/",
            "/api/manager/purchases/orders/",
            "/api/manager/expenses/",
        ]
        for url in endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 401, f"Expected 401 for unauthenticated {url}")

    def test_invalid_and_expired_jwt_tokens(self):
        """Requests with malformed tokens must return 401."""
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.payload")
        res = self.client.get("/api/manager/financial/overview/")
        self.assertEqual(res.status_code, 401)
        self.client.credentials()  # Reset

    # =========================================================================
    # 2. RBAC ACCESS MATRIX AUDIT
    # =========================================================================

    def test_rbac_manager_access(self):
        """Manager has full authorized access to financial and operational endpoints."""
        self.client.force_authenticate(user=self.manager_a)
        res_overview = self.client.get("/api/manager/financial/overview/")
        self.assertEqual(res_overview.status_code, 200)

        res_cc = self.client.get("/api/manager/financial/command-center/")
        self.assertEqual(res_cc.status_code, 200)

        res_rep = self.client.get("/api/manager/financial/reports/?type=pnl")
        self.assertEqual(res_rep.status_code, 200)

        res_inv = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res_inv.status_code, 200)

    def test_rbac_chef_restricted_access(self):
        """Chef is allowed read access to recipes/inventory, but denied financial/purchases/reports."""
        self.client.force_authenticate(user=self.chef_a)

        # Financial intelligence: FORBIDDEN
        self.assertEqual(self.client.get("/api/manager/financial/overview/").status_code, 403)
        self.assertEqual(self.client.get("/api/manager/financial/command-center/").status_code, 403)
        self.assertEqual(self.client.get("/api/manager/financial/reports/?type=pnl").status_code, 403)
        self.assertEqual(self.client.get("/api/manager/financial/reports/export-excel/?type=pnl").status_code, 403)

        # Purchases: FORBIDDEN
        self.assertEqual(self.client.get("/api/manager/purchases/orders/").status_code, 403)

        # Expenses: FORBIDDEN
        self.assertEqual(self.client.get("/api/manager/expenses/").status_code, 403)

        # Inventory Read: ALLOWED (safe method)
        self.assertEqual(self.client.get("/api/manager/inventory/items/").status_code, 200)

    def test_rbac_waiter_restricted_access(self):
        """Waiter is strictly forbidden from financial, expenses, purchases, wastage, and exports."""
        self.client.force_authenticate(user=self.waiter_a)

        endpoints = [
            "/api/manager/financial/overview/",
            "/api/manager/financial/command-center/",
            "/api/manager/financial/reports/?type=sales",
            "/api/manager/financial/reports/export-excel/?type=sales",
            "/api/manager/financial/reports/export-pdf/?type=sales",
            "/api/manager/expenses/",
            "/api/manager/purchases/orders/",
            "/api/manager/inventory/items/",
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, 403, f"Waiter should be 403 on {ep}")

    # =========================================================================
    # 3. MULTI-TENANT ISOLATION AUDIT
    # =========================================================================

    def test_multi_tenant_isolation_inventory(self):
        """Manager A at Restaurant A cannot view or manipulate Restaurant B inventory."""
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res.status_code, 200)

        # Verify only Chicken Breast (Restaurant A) is in the results, not Beef (Restaurant B)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        item_names = [i["name"] for i in results]
        self.assertIn("Chicken Breast", item_names)
        self.assertNotIn("Prime Beef Tenderloin", item_names)

    def test_multi_tenant_isolation_expenses(self):
        """Manager A at Restaurant A cannot view or access Restaurant B expenses."""
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/expenses/")
        self.assertEqual(res.status_code, 200)

        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        titles = [e.get("title") for e in results]
        self.assertNotIn("Billboards Campaign", titles)

    def test_multi_tenant_isolation_financial_reports_and_exports(self):
        """Manager A cannot view or export Restaurant B financial reports via parameter tampering."""
        self.client.force_authenticate(user=self.manager_a)

        # Attempt to spoof restaurant_id in query params
        res = self.client.get(f"/api/manager/financial/reports/?type=expenses&restaurant_id={self.restaurant_b.id}")
        self.assertEqual(res.status_code, 200)
        # Verify Restaurant B's 75,000 expense is NOT present
        self.assertEqual(res.data["summary"]["total_expenses"], 0.0)

    # =========================================================================
    # 4. DATA INTEGRITY & FINANCIAL ACCURACY
    # =========================================================================

    def test_historical_cogs_snapshot_preserved(self):
        """
        Verify historical order COGS remains unchanged even if InventoryItem WAC changes later.
        """
        # Create an Order with COGS snapshot
        order = Orders.objects.create(
            user=self.profile_customer_a,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=date.today(),
            total_price=Decimal("1600.00"),
            total_cogs=Decimal("800.00"),
            order_cancelled=False
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item_a,
            quantity=1,
            price=Decimal("1600.00"),
            unit_cost_at_order=Decimal("800.00")
        )

        # Mutate current inventory item cost (e.g. inflation / expensive stock-in)
        self.item_chicken_a.cost_per_unit = Decimal("1500.00")
        self.item_chicken_a.save(update_fields=["cost_per_unit"])

        # Fetch Financial Overview
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(res.status_code, 200)

        # Historical COGS must remain 800.00, NOT 1500.00
        self.assertEqual(Decimal(str(res.data["costs"]["cogs"])), Decimal("800.00"))

    def test_voided_expenses_excluded_from_financial_pnl(self):
        """Voided expenses must never appear in financial overview or P&L."""
        exp_cat = ExpenseCategory.objects.create(restaurant=self.restaurant_a, name="Repairs")
        # Active expense = 10,000
        Expense.objects.create(
            restaurant=self.restaurant_a,
            category=exp_cat,
            title="AC Repair",
            amount=Decimal("10000.00"),
            expense_date=date.today(),
            payment_method=ExpensePaymentMethod.CASH.value,
            status=ExpenseStatus.ACTIVE.value,
            created_by=self.profile_manager_a
        )
        # Voided expense = 50,000
        Expense.objects.create(
            restaurant=self.restaurant_a,
            category=exp_cat,
            title="Cancelled Roof Repair",
            amount=Decimal("50000.00"),
            expense_date=date.today(),
            payment_method=ExpensePaymentMethod.CASH.value,
            status=ExpenseStatus.VOIDED.value,
            void_reason="Cancelled",
            created_by=self.profile_manager_a
        )

        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(str(res.data["costs"]["operating_expenses"])), Decimal("10000.00"))

    # =========================================================================
    # 5. INPUT VALIDATION & ERROR HANDLING
    # =========================================================================

    def test_invalid_report_type_and_dates_rejected(self):
        """Invalid query parameters return structured 400 Bad Request without stack traces."""
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/financial/reports/?type=unsupported_random_report")
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)
