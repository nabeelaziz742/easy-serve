"""Restaurant billing settings, checkout totals and the printable bill."""
from decimal import Decimal

from apps.restaurants.models import Orders
from apps.restaurants.tests_qa_regression import QAWorkflowBase


class BillingSettingsTests(QAWorkflowBase):
    def test_defaults_keep_item_total(self):
        token = self.start_session()
        order = Orders.objects.get(id=self.place_dine_in(token))
        self.assertEqual(order.subtotal, order.total_price)
        self.assertEqual(order.tax_amount, Decimal("0.00"))
        self.assertEqual(order.service_charge_amount, Decimal("0.00"))

    def test_manager_reads_and_updates_settings(self):
        self.as_user(self.manager)
        res = self.client.get("/api/restaurants/manager/settings/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["name"], "QA Alpha")

        res = self.client.patch(
            "/api/restaurants/manager/settings/",
            {
                "address": "Main Boulevard",
                "tax_percent": "16.00",
                "service_charge_percent": "5",
                "tax_number": "NTN-123",
                "hours": [{"day_of_week": 0, "open_time": "12:00", "close_time": "23:00"}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.tax_percent, Decimal("16.00"))
        self.assertEqual(self.restaurant.address, "Main Boulevard")
        self.assertEqual(self.restaurant.hours.count(), 1)

    def test_settings_validation_and_access(self):
        self.as_user(self.manager)
        res = self.client.patch("/api/restaurants/manager/settings/", {"tax_percent": "150"}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(
            "/api/restaurants/manager/settings/",
            {"hours": [
                {"day_of_week": 1, "open_time": "09:00", "close_time": "17:00"},
                {"day_of_week": 1, "open_time": "18:00", "close_time": "22:00"},
            ]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        for user in (self.waiter, self.customer):
            self.as_user(user)
            self.assertEqual(self.client.get("/api/restaurants/manager/settings/").status_code, 403)

    def test_checkout_adds_service_charge_and_tax(self):
        self.restaurant.tax_percent = Decimal("16")
        self.restaurant.service_charge_percent = Decimal("5")
        self.restaurant.save()

        token = self.start_session()
        order = Orders.objects.get(id=self.place_dine_in(token))
        subtotal = order.subtotal
        self.assertEqual(order.service_charge_amount, (subtotal * Decimal("0.05")).quantize(Decimal("0.01")))
        self.assertEqual(order.tax_amount, (subtotal * Decimal("0.16")).quantize(Decimal("0.01")))
        self.assertEqual(order.total_price, subtotal + order.service_charge_amount + order.tax_amount)

        res = self.client.get(f"/api/restaurants/restaurants/{self.restaurant.id}/billing/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(str(res.data["tax_percent"])), Decimal("16.00"))

    def test_receipt_access(self):
        token = self.start_session()
        oid = self.place_dine_in(token)
        url = f"/api/restaurants/orders/{oid}/receipt/"

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(url).status_code, 403)
        res = self.client.get(url, HTTP_X_DINE_IN_TOKEN=token)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["restaurant"]["name"], "QA Alpha")
        self.assertTrue(res.data["items"])
        self.assertEqual(Decimal(str(res.data["total"])), Orders.objects.get(id=oid).total_price)

        self.as_user(self.waiter)
        self.assertEqual(self.client.get(url).status_code, 200)

        other_manager = self.make_other_manager()
        self.as_user(other_manager)
        self.assertEqual(self.client.get(url).status_code, 403)

    def make_other_manager(self):
        from apps.restaurants.tests_qa_regression import make_user
        user, _ = make_user("billing-manager@beta.qa", "manager", self.other)
        return user


class TaxInReportsTests(QAWorkflowBase):
    """GST collected on a bill is owed to the government, not restaurant sales."""

    def test_sales_exclude_tax_and_tax_is_shown_separately(self):
        self.restaurant.tax_percent = Decimal("16")
        self.restaurant.service_charge_percent = Decimal("5")
        self.restaurant.save()

        token = self.start_session()
        oid = self.place_dine_in(token)
        self.to_served(oid)
        self.pay_cash(oid)
        order = Orders.objects.get(id=oid)
        net = order.total_price - order.tax_amount
        self.assertGreater(order.tax_amount, 0)

        self.as_user(self.manager)
        revenue = self.client.get("/api/manager/financial/overview/?period=today").data["revenue"]
        self.assertEqual(Decimal(str(revenue["gross_sales"])), net)
        self.assertEqual(Decimal(str(revenue["tax_collected"])), order.tax_amount)

        dashboard = self.client.get("/api/restaurants/manager/dashboard/")
        self.assertEqual(Decimal(str(dashboard.data["total_revenue"])), net)

        sales = self.client.get("/api/manager/financial/reports/?type=sales&period=today")
        rows = sales.data.get("orders") or sales.data.get("data", {}).get("orders")
        self.assertEqual(Decimal(str(rows[0]["tax_amount"])), order.tax_amount)

        recon = self.client.get("/api/manager/financial/reconciliation/?period=today")
        self.assertEqual(recon.status_code, 200, recon.data)
        self.assertEqual(recon.data["reconciliation_status"], "RECONCILED", recon.data)
