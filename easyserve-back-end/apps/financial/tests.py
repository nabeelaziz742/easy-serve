from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.restaurants.models import (
    Restaurant, Menu, MenuItem, Orders, OrderItem, Category
)
from apps.restaurants.constants import OrderStatus, PaymentStatus, OrderType, PaymentMethod
from apps.inventory.models import UnitOfMeasure, InventoryCategory, InventoryItem, StockWastage
from apps.inventory.constants import WastageReason, StockMovementType
from apps.recipes.models import Recipe, RecipeItem
from apps.expenses.models import ExpenseCategory, Expense
from apps.expenses.constants import ExpenseStatus, ExpensePaymentMethod
from apps.financial.services.financial_service import FinancialReportService
from apps.userprofile.models import UserProfile

User = get_user_model()


class FinancialIntelligenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Restaurant A
        self.restaurant_a = Restaurant.objects.create(
            name="Emerald Bistro A",
            address="Downtown",
            phone_number="123456789",
            city="Karachi",
        )

        # Create Restaurant B (For multi-tenant isolation testing)
        self.restaurant_b = Restaurant.objects.create(
            name="Emerald Bistro B",
            address="Uptown",
            phone_number="987654321",
            city="Karachi",
        )

        # Manager A
        self.manager_user = User.objects.create_user(
            username="manager_a",
            email="manager_a@easyserve.com",
            password="password123",
            user_type="manager"
        )
        self.manager_profile = UserProfile.objects.create(
            user=self.manager_user,
            restaurant=self.restaurant_a
        )

        # Waiter (Unauthorized for financial intelligence)
        self.waiter_user = User.objects.create_user(
            username="waiter_a",
            email="waiter_a@easyserve.com",
            password="password123",
            user_type="waiter"
        )
        UserProfile.objects.create(
            user=self.waiter_user,
            restaurant=self.restaurant_a
        )

        # Customer User
        self.customer_user = User.objects.create_user(
            username="customer_one",
            email="customer@example.com",
            password="password123",
            user_type="customer"
        )
        self.customer_profile = UserProfile.objects.create(
            user=self.customer_user
        )

        # Menu & MenuItems for Restaurant A
        self.menu_a = Menu.objects.create(restaurant=self.restaurant_a, name="Main Menu")
        self.cat_a = Category.objects.create(name="Burgers")
        self.burger_item = MenuItem.objects.create(
            menu=self.menu_a,
            category=self.cat_a,
            name="Zinger Burger",
            price=Decimal("600.00"),
            is_available=True
        )

        # Inventory Items & Units
        self.uom_kg = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Kilogram",
            short_code="kg"
        )
        self.inv_cat = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Meat & Poultry"
        )
        self.chicken_item = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            name="Chicken Patty",
            sku="PATTY-001",
            category=self.inv_cat,
            uom=self.uom_kg,
            current_stock=Decimal("100.00"),
            cost_per_unit=Decimal("200.00")
        )

        # Recipe for Zinger Burger (Consumes 0.25 kg Patty)
        self.recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.burger_item,
            yield_servings=Decimal('1.00'),
            is_active=True
        )
        RecipeItem.objects.create(
            recipe=self.recipe,
            inventory_item=self.chicken_item,
            quantity_required=Decimal("0.25"),
            uom=self.uom_kg
        )

        # Expense Category & Active Expense
        self.exp_cat = ExpenseCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Utilities"
        )
        self.today = date.today()
        self.expense_active = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.exp_cat,
            title="Electricity Bill",
            amount=Decimal("5000.00"),
            expense_date=self.today,
            payment_method=ExpensePaymentMethod.BANK_TRANSFER.value,
            status=ExpenseStatus.ACTIVE.value,
            created_by=self.manager_profile
        )
        # Voided expense (Should be excluded from financial calculations)
        self.expense_voided = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.exp_cat,
            title="Cancelled Repair",
            amount=Decimal("3000.00"),
            expense_date=self.today,
            payment_method=ExpensePaymentMethod.CASH.value,
            status=ExpenseStatus.VOIDED.value,
            void_reason="Duplicate entry",
            voided_by=self.manager_profile,
            created_by=self.manager_profile
        )

        # Stock Wastage Record
        self.wastage = StockWastage.objects.create(
            restaurant=self.restaurant_a,
            inventory_item=self.chicken_item,
            quantity=Decimal("2.00"),
            uom=self.uom_kg,
            reason=WastageReason.EXPIRED.value,
            unit_cost=Decimal("200.00"),
            total_cost=Decimal("400.00"),
            wastage_date=self.today,
            created_by=self.manager_profile
        )

    def test_financial_overview_calculation(self):
        """
        Tests revenue, COGS, gross profit, wastage, expenses, and net operating result.
        """
        # Create a valid confirmed sales order
        order = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=self.today,
            total_price=Decimal("1200.00"),
            total_cogs=Decimal("400.00"),  # 2 burgers * 200 COGS
            order_cancelled=False
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.burger_item,
            quantity=2,
            price=Decimal("600.00"),
            unit_cost_at_order=Decimal("200.00")
        )

        overview = FinancialReportService.calculate_overview(
            restaurant=self.restaurant_a,
            start_date=self.today,
            end_date=self.today
        )

        # Revenue: Rs. 1,200.00
        self.assertEqual(overview["revenue"]["gross_sales"], Decimal("1200.00"))
        self.assertEqual(overview["revenue"]["net_sales"], Decimal("1200.00"))
        self.assertEqual(overview["revenue"]["orders_count"], 1)

        # COGS: Rs. 400.00 (Food Cost %: 33.33%)
        self.assertEqual(overview["costs"]["cogs"], Decimal("400.00"))
        self.assertEqual(overview["costs"]["food_cost_percentage"], Decimal("33.33"))

        # Gross Profit = 1200 - 400 = Rs. 800.00 (Gross Margin: 66.67%)
        self.assertEqual(overview["profitability"]["gross_profit"], Decimal("800.00"))
        self.assertEqual(overview["profitability"]["gross_margin"], Decimal("66.67"))

        # Operating Expenses: Active Rs. 5,000 (Voided Rs. 3,000 excluded)
        self.assertEqual(overview["costs"]["operating_expenses"], Decimal("5000.00"))

        # Wastage: Rs. 400.00
        self.assertEqual(overview["costs"]["wastage"], Decimal("400.00"))

        # Operating Result = Gross Profit (800) - Wastage (400) - Expenses (5000) = -4600.00
        self.assertEqual(overview["profitability"]["operating_result"], Decimal("-4600.00"))

    def test_historical_cogs_protection_against_wac_changes(self):
        """
        CRITICAL TEST: Verifies that subsequent changes to InventoryItem WAC
        do NOT alter historical COGS in past financial reports.
        """
        order_date = self.today - timedelta(days=5)

        # 1. Place and finalize order on past order date with snapshotted COGS = Rs. 200.00
        order = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=order_date,
            total_price=Decimal("600.00"),
            total_cogs=Decimal("200.00"),
            order_cancelled=False
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.burger_item,
            quantity=1,
            price=Decimal("600.00"),
            unit_cost_at_order=Decimal("200.00")
        )

        # 2. Simulate future purchases that dramatically inflate inventory WAC to Rs. 500.00
        self.chicken_item.cost_per_unit = Decimal("500.00")
        self.chicken_item.save(update_fields=['cost_per_unit'])

        # 3. Generate financial report for the original past order date
        overview = FinancialReportService.calculate_overview(
            restaurant=self.restaurant_a,
            start_date=order_date,
            end_date=order_date
        )

        # 4. Verify COGS remains the historically snapshotted Rs. 200.00, NOT the new Rs. 500.00
        self.assertEqual(overview["costs"]["cogs"], Decimal("200.00"))
        self.assertEqual(overview["profitability"]["gross_profit"], Decimal("400.00"))

    def test_unpaid_or_cancelled_orders_excluded_from_financials(self):
        """
        Verifies that cancelled or unconfirmed orders are strictly excluded.
        """
        # Cancelled Order
        Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CANCELLED.value,
            ordered_date=self.today,
            total_price=Decimal("1000.00"),
            total_cogs=Decimal("300.00"),
            order_cancelled=True
        )

        # Pending Unpaid Order
        Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.TO_PREPARE.value,
            payment_status=PaymentStatus.PENDING.value,
            ordered_date=self.today,
            total_price=Decimal("1500.00"),
            total_cogs=Decimal("500.00"),
            order_cancelled=False
        )

        overview = FinancialReportService.calculate_overview(
            restaurant=self.restaurant_a,
            start_date=self.today,
            end_date=self.today
        )

        self.assertEqual(overview["revenue"]["net_sales"], Decimal("0.00"))
        self.assertEqual(overview["costs"]["cogs"], Decimal("0.00"))

    def test_multi_tenant_isolation(self):
        """
        Verifies Restaurant A cannot access Restaurant B's financial data.
        """
        # Order in Restaurant B
        menu_b = Menu.objects.create(restaurant=self.restaurant_b, name="Menu B")
        item_b = MenuItem.objects.create(menu=menu_b, name="Steak", price=Decimal("2000.00"))
        order_b = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=self.today,
            total_price=Decimal("2000.00"),
            total_cogs=Decimal("800.00"),
            order_cancelled=False
        )
        OrderItem.objects.create(order=order_b, menu_item=item_b, quantity=1, price=Decimal("2000.00"))

        # Query overview for Restaurant A
        overview_a = FinancialReportService.calculate_overview(
            restaurant=self.restaurant_a,
            start_date=self.today,
            end_date=self.today
        )
        self.assertEqual(overview_a["revenue"]["net_sales"], Decimal("0.00"))

    def test_financial_reconciliation_zero_difference(self):
        """
        Verifies that mathematical cross-ledger reconciliation passes with 0 difference.
        """
        order = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=self.today,
            total_price=Decimal("1200.00"),
            total_cogs=Decimal("400.00"),
            order_cancelled=False
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.burger_item,
            quantity=2,
            price=Decimal("600.00"),
            unit_cost_at_order=Decimal("200.00")
        )

        reconciliation = FinancialReportService.calculate_reconciliation(
            restaurant=self.restaurant_a,
            start_date=self.today,
            end_date=self.today
        )

        self.assertEqual(reconciliation["reconciliation_status"], "RECONCILED")
        self.assertEqual(reconciliation["revenue_audit"]["difference"], Decimal("0.00"))
        self.assertEqual(reconciliation["cogs_audit"]["difference"], Decimal("0.00"))
        self.assertEqual(reconciliation["expense_audit"]["difference"], Decimal("0.00"))
        self.assertEqual(reconciliation["wastage_audit"]["difference"], Decimal("0.00"))

    def test_product_performance_calculation(self):
        """
        Verifies product-level profitability and food cost % calculations.
        """
        order = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=self.today,
            total_price=Decimal("1800.00"),
            total_cogs=Decimal("600.00"),
            order_cancelled=False
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.burger_item,
            quantity=3,
            price=Decimal("600.00"),
            unit_cost_at_order=Decimal("200.00")
        )

        products = FinancialReportService.calculate_product_performance(
            restaurant=self.restaurant_a,
            start_date=self.today,
            end_date=self.today
        )

        self.assertEqual(len(products), 1)
        p = products[0]
        self.assertEqual(p["name"], "Zinger Burger")
        self.assertEqual(p["units_sold"], 3)
        self.assertEqual(p["revenue"], Decimal("1800.00"))
        self.assertEqual(p["cogs"], Decimal("600.00"))
        self.assertEqual(p["gross_profit"], Decimal("1200.00"))
        self.assertEqual(p["food_cost_percentage"], 33.3)
        self.assertEqual(p["status"], "HEALTHY")

    def test_rbac_api_access(self):
        """
        Tests API endpoint authorization: Manager allowed, Waiter denied.
        """
        # Authenticate as Manager
        self.client.force_authenticate(user=self.manager_user)
        res_manager = self.client.get("/api/manager/financial/overview/")
        self.assertEqual(res_manager.status_code, 200)

        # Authenticate as Waiter
        self.client.force_authenticate(user=self.waiter_user)
        res_waiter = self.client.get("/api/manager/financial/overview/")
        self.assertEqual(res_waiter.status_code, 403)

    def test_all_financial_endpoints_response_format(self):
        """
        Verifies that all 7 financial API endpoints return 200 OK with correct payloads.
        """
        self.client.force_authenticate(user=self.manager_user)

        # 1. Trends
        res_trends = self.client.get("/api/manager/financial/trends/")
        self.assertEqual(res_trends.status_code, 200)
        self.assertIsInstance(res_trends.data, list)

        # 2. Revenue Breakdown
        res_rev = self.client.get("/api/manager/financial/revenue-breakdown/")
        self.assertEqual(res_rev.status_code, 200)
        self.assertIn("by_payment_method", res_rev.data)
        self.assertIn("by_order_type", res_rev.data)

        # 3. Expense Breakdown
        res_exp = self.client.get("/api/manager/financial/expense-breakdown/")
        self.assertEqual(res_exp.status_code, 200)
        self.assertIn("categories", res_exp.data)

        # 4. Wastage Breakdown
        res_wst = self.client.get("/api/manager/financial/wastage-breakdown/")
        self.assertEqual(res_wst.status_code, 200)
        self.assertIn("by_reason", res_wst.data)
        self.assertIn("top_wasted_items", res_wst.data)

        # 5. Product Performance
        res_prod = self.client.get("/api/manager/financial/product-performance/")
        self.assertEqual(res_prod.status_code, 200)
        self.assertIsInstance(res_prod.data, list)

        # 6. Reconciliation
        res_rec = self.client.get("/api/manager/financial/reconciliation/")
        self.assertEqual(res_rec.status_code, 200)
        self.assertEqual(res_rec.data["reconciliation_status"], "RECONCILED")

    def test_zero_sales_margin_scenario(self):
        """
        Verifies that zero revenue does not cause ZeroDivisionError and yields 0.00% margins.
        """
        overview = FinancialReportService.calculate_overview(
            restaurant=self.restaurant_a,
            start_date=self.today - timedelta(days=50),
            end_date=self.today - timedelta(days=40)
        )
        self.assertEqual(overview["revenue"]["net_sales"], Decimal("0.00"))
        self.assertEqual(overview["profitability"]["gross_margin"], Decimal("0.00"))
        self.assertEqual(overview["profitability"]["net_margin"], Decimal("0.00"))
        self.assertEqual(overview["profitability"]["health_status"], "NO_ACTIVITY")

    def test_command_center_endpoint_and_service(self):
        """
        Verifies the Command Center aggregation endpoint and multi-tenant isolation.
        """
        # Create a low-stock inventory item and an out-of-stock inventory item
        self.chicken_item.current_stock = Decimal("0.000")
        self.chicken_item.save(update_fields=["current_stock"])

        InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            name="Burger Buns",
            sku="BUN-01",
            category=self.inv_cat,
            uom=self.uom_kg,
            current_stock=Decimal("2.000"),
            min_reorder_level=Decimal("5.000"),
            cost_per_unit=Decimal("20.00")
        )

        # Authenticate as Manager
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.get("/api/manager/financial/command-center/?period=today")
        self.assertEqual(res.status_code, 200)

        data = res.data
        self.assertIn("period", data)
        self.assertIn("financial", data)
        self.assertIn("pipeline", data)
        self.assertIn("attention", data)
        self.assertIn("inventory_alerts", data)
        self.assertIn("recent_purchases", data)
        self.assertIn("recent_expenses", data)
        self.assertIn("top_products", data)
        self.assertIn("recent_activities", data)
        self.assertIn("trends", data)

        # Check inventory alerts
        inv_alerts = data["inventory_alerts"]
        self.assertGreaterEqual(inv_alerts["out_of_stock_count"], 1)
        self.assertGreaterEqual(inv_alerts["low_stock_count"], 1)

        # Check attention alerts
        attention = data["attention"]
        self.assertGreaterEqual(attention["total_alerts"], 1)

        # Test Waiter is Forbidden
        self.client.force_authenticate(user=self.waiter_user)
        res_waiter = self.client.get("/api/manager/financial/command-center/?period=today")
        self.assertEqual(res_waiter.status_code, 403)


class ReportCenterAndExportTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Restaurant A
        self.restaurant_a = Restaurant.objects.create(
            name="Emerald Bistro A",
            address="Karachi South",
            phone_number="03001112233",
            city="Karachi"
        )
        # Restaurant B
        self.restaurant_b = Restaurant.objects.create(
            name="Emerald Bistro B",
            address="Karachi North",
            phone_number="03009998877",
            city="Karachi"
        )

        # Manager A
        self.manager_a = User.objects.create_user(
            username="manager_a_p8",
            email="manager_a_p8@easyserve.com",
            password="password123",
            user_type="manager"
        )
        self.manager_profile_a = UserProfile.objects.create(user=self.manager_a, restaurant=self.restaurant_a)

        # Manager B
        self.manager_b = User.objects.create_user(
            username="manager_b_p8",
            email="manager_b_p8@easyserve.com",
            password="password123",
            user_type="manager"
        )
        self.manager_profile_b = UserProfile.objects.create(user=self.manager_b, restaurant=self.restaurant_b)

        # Waiter
        self.waiter = User.objects.create_user(
            username="waiter_p8",
            email="waiter_p8@easyserve.com",
            password="password123",
            user_type="waiter"
        )
        UserProfile.objects.create(user=self.waiter, restaurant=self.restaurant_a)

        # Customer User
        self.customer = User.objects.create_user(
            username="customer_p8",
            email="customer_p8@easyserve.com",
            password="password123",
            user_type="customer"
        )
        self.customer_profile = UserProfile.objects.create(user=self.customer, restaurant=self.restaurant_a)

        # Inventory Item
        self.uom_kg = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Kilogram",
            short_code="kg"
        )
        self.inv_cat = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Meat & Poultry"
        )
        self.item_beef = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            name="Beef Steak",
            sku="BEEF-01",
            category=self.inv_cat,
            uom=self.uom_kg,
            current_stock=Decimal("15.000"),
            min_reorder_level=Decimal("5.000"),
            cost_per_unit=Decimal("1200.00")
        )

        # Menu & Menu Item
        self.menu = Menu.objects.create(restaurant=self.restaurant_a, name="Main Menu")
        self.cat = Category.objects.create(name="Steaks")
        self.menu_steak = MenuItem.objects.create(
            menu=self.menu,
            category=self.cat,
            name="T-Bone Steak",
            price=Decimal("2500.00"),
            is_available=True
        )

        # Order A (Confirmed & Paid)
        self.order_a = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
            ordered_date=date.today(),
            total_price=Decimal("5000.00"),
            total_cogs=Decimal("2400.00"),
            order_cancelled=False
        )
        OrderItem.objects.create(
            order=self.order_a,
            menu_item=self.menu_steak,
            quantity=2,
            price=Decimal("2500.00"),
            unit_cost_at_order=Decimal("1200.00")
        )

        # Expense A (Active)
        self.exp_cat = ExpenseCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Utilities"
        )
        self.exp_active = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.exp_cat,
            title="Electricity Bill",
            amount=Decimal("15000.00"),
            expense_date=date.today(),
            payment_method=ExpensePaymentMethod.BANK_TRANSFER.value,
            status=ExpenseStatus.ACTIVE.value,
            created_by=self.manager_profile_a
        )
        # Expense Voided (Must be excluded from reports)
        self.exp_voided = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.exp_cat,
            title="Cancelled Gas Bill",
            amount=Decimal("5000.00"),
            expense_date=date.today(),
            payment_method=ExpensePaymentMethod.CASH.value,
            status=ExpenseStatus.VOIDED.value,
            void_reason="Cancelled",
            created_by=self.manager_profile_a
        )

        # Wastage A
        self.wastage_a = StockWastage.objects.create(
            restaurant=self.restaurant_a,
            inventory_item=self.item_beef,
            quantity=Decimal("1.500"),
            uom=self.uom_kg,
            unit_cost=Decimal("1200.00"),
            total_cost=Decimal("1800.00"),
            reason=WastageReason.EXPIRED.value,
            wastage_date=date.today(),
            created_by=self.manager_profile_a
        )

    def test_all_10_reports_data_endpoint(self):
        """
        Verify all 10 report types return HTTP 200 with complete structured data.
        """
        self.client.force_authenticate(user=self.manager_a)
        report_types = [
            "pnl", "sales", "cogs", "products", "expenses",
            "wastage", "inventory", "movements", "purchases", "reconciliation"
        ]

        for r_type in report_types:
            res = self.client.get(f"/api/manager/financial/reports/?type={r_type}&period=this_month")
            self.assertEqual(
                res.status_code, 200,
                f"Report type '{r_type}' failed with status {res.status_code}: {res.data}"
            )
            data = res.data
            self.assertEqual(data["report_type"], r_type)
            self.assertIn("title", data)
            self.assertIn("metadata", data)
            self.assertEqual(data["metadata"]["restaurant_name"], "Emerald Bistro A")

    def test_invalid_report_type(self):
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/financial/reports/?type=unsupported_type")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid report type", res.data["detail"])

    def test_excel_export_all_10_reports(self):
        """
        Verify all 10 report types export valid .xlsx binary spreadsheets.
        """
        import openpyxl
        import io

        self.client.force_authenticate(user=self.manager_a)
        report_types = [
            "pnl", "sales", "cogs", "products", "expenses",
            "wastage", "inventory", "movements", "purchases", "reconciliation"
        ]

        for r_type in report_types:
            res = self.client.get(f"/api/manager/financial/reports/export-excel/?type={r_type}&period=this_month")
            self.assertEqual(
                res.status_code, 200,
                f"Excel export for '{r_type}' failed with status {res.status_code}"
            )
            self.assertEqual(
                res["Content-Type"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            self.assertIn(".xlsx", res["Content-Disposition"])
            self.assertGreater(len(res.content), 100)

            # Validate openpyxl can load the generated workbook
            wb = openpyxl.load_workbook(io.BytesIO(res.content))
            self.assertGreater(len(wb.sheetnames), 0)

    def test_pdf_export_all_10_reports(self):
        """
        Verify all 10 report types export valid .pdf documents with %PDF header.
        """
        self.client.force_authenticate(user=self.manager_a)
        report_types = [
            "pnl", "sales", "cogs", "products", "expenses",
            "wastage", "inventory", "movements", "purchases", "reconciliation"
        ]

        for r_type in report_types:
            res = self.client.get(f"/api/manager/financial/reports/export-pdf/?type={r_type}&period=this_month")
            self.assertEqual(
                res.status_code, 200,
                f"PDF export for '{r_type}' failed with status {res.status_code}"
            )
            self.assertEqual(res["Content-Type"], "application/pdf")
            self.assertIn(".pdf", res["Content-Disposition"])
            self.assertTrue(res.content.startswith(b"%PDF"))
            self.assertGreater(len(res.content), 500)

    def test_multi_tenant_isolation_reports_and_exports(self):
        """
        Manager B at Restaurant B must never see Restaurant A's sales, expenses, or inventory.
        """
        # Manager B requests sales report
        self.client.force_authenticate(user=self.manager_b)
        res = self.client.get("/api/manager/financial/reports/?type=sales&period=this_month")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["summary"]["total_orders"], 0)
        self.assertEqual(res.data["summary"]["gross_sales"], 0.0)
        self.assertEqual(len(res.data["orders"]), 0)

        # Manager B requests expenses report
        res_exp = self.client.get("/api/manager/financial/reports/?type=expenses&period=this_month")
        self.assertEqual(res_exp.status_code, 200)
        self.assertEqual(res_exp.data["summary"]["total_expenses"], 0.0)
        self.assertEqual(len(res_exp.data["expenses"]), 0)

    def test_rbac_unauthorized_roles(self):
        """
        Waiters and unauthenticated requests must be denied 403 / 401.
        """
        self.client.force_authenticate(user=self.waiter)
        # Reports data
        res_data = self.client.get("/api/manager/financial/reports/?type=pnl")
        self.assertEqual(res_data.status_code, 403)

        # Excel export
        res_excel = self.client.get("/api/manager/financial/reports/export-excel/?type=pnl")
        self.assertEqual(res_excel.status_code, 403)

        # PDF export
        res_pdf = self.client.get("/api/manager/financial/reports/export-pdf/?type=pnl")
        self.assertEqual(res_pdf.status_code, 403)

    def test_voided_expenses_excluded_from_reports(self):
        """
        Ensure voided expenses are never counted in total expenses or financial reports.
        """
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.get("/api/manager/financial/reports/?type=expenses&period=this_month")
        self.assertEqual(res.status_code, 200)
        # Active expense = 15000, Voided = 5000 (must NOT be in total)
        self.assertEqual(res.data["summary"]["total_expenses"], 15000.0)
        self.assertEqual(len(res.data["expenses"]), 1)
        self.assertEqual(res.data["expenses"][0]["title"], "Electricity Bill")

    def test_empty_period_reports_and_exports(self):
        """
        Ensure requesting a date range with zero data returns 200 OK and generates valid files.
        """
        self.client.force_authenticate(user=self.manager_a)
        past_start = (date.today() - timedelta(days=200)).isoformat()
        past_end = (date.today() - timedelta(days=190)).isoformat()

        # Data endpoint
        res = self.client.get(f"/api/manager/financial/reports/?type=sales&start_date={past_start}&end_date={past_end}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["summary"]["total_orders"], 0)

        # Excel
        res_excel = self.client.get(f"/api/manager/financial/reports/export-excel/?type=sales&start_date={past_start}&end_date={past_end}")
        self.assertEqual(res_excel.status_code, 200)

        # PDF
        res_pdf = self.client.get(f"/api/manager/financial/reports/export-pdf/?type=sales&start_date={past_start}&end_date={past_end}")
        self.assertEqual(res_pdf.status_code, 200)
        self.assertTrue(res_pdf.content.startswith(b"%PDF"))



