"""
End-to-end order flow from the customer's QR scan to the manager's cash
settlement, as the user described it:

scan Table 1 -> menu -> checkout -> Pay with cash -> waiter receives ->
chef prepares -> waiter serves -> waiter collects cash -> manager settles
-> Net Sales updated and the table is free again everywhere.
"""
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.utils import timezone

from apps.restaurants.constants import DineInSessionStatus, OrderStatus, PaymentStatus, TableState
from apps.restaurants.models import DineInSession, Orders
from apps.restaurants.tests_qa_regression import QAWorkflowBase


def rows(data):
    return data.get("results", data) if isinstance(data, dict) else data


class OrderFlowBase(QAWorkflowBase):
    def setUp(self):
        super().setUp()
        self.table.assigned_waiter = self.waiter_p
        self.table.save()

    def get(self, user, url):
        self.as_user(user)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200, res.data)
        return res.data

    def active_tables(self):
        return self.get(self.waiter, "/api/dashboard/waiter/dashboard/")["stats"]["active_tables"]

    def tables_page_status(self):
        return rows(self.get(self.manager, "/api/dashboard/tables/"))[0]["status"]

    def waiter_pending_ids(self):
        return [o["id"] for o in rows(self.get(self.waiter, "/api/restaurants/orders/pending/"))]

    def waiter_cash_ids(self):
        return [o["id"] for o in rows(self.get(self.waiter, "/api/restaurants/orders/waiter/cash/"))]

    def manager_cash_ids(self):
        return [o["id"] for o in rows(self.get(self.manager, "/api/restaurants/orders/manager/cash/"))]

    def net_sales(self):
        return self.get(self.manager, "/api/manager/financial/overview/?period=today")["revenue"]["net_sales"]

    def ok(self, user, url):
        res = self.post(user, url)
        self.assertEqual(res.status_code, 200, (url, res.data))
        return res


class FullCashFlowTests(OrderFlowBase):
    def test_table_1_cash_flow_end_to_end(self):
        token = self.start_session()
        self.assertEqual(self.active_tables(), 1)
        self.assertEqual(self.tables_page_status(), "OCCUPIED")

        oid = self.place_dine_in(token)
        # Checkout alone does not reach the waiter; the customer is on the
        # payment page.
        self.assertNotIn(oid, self.waiter_pending_ids())

        self.ok(self.customer, f"/api/restaurants/orders/{oid}/cash-request/")
        self.assertIn(oid, self.waiter_pending_ids())
        # Nothing to collect before the food is served.
        self.assertNotIn(oid, self.waiter_cash_ids())

        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/accept/")
        self.assertNotIn(oid, self.waiter_pending_ids())
        self.ok(self.chef, f"/api/restaurants/orders/{oid}/start-preparing/")
        self.assertEqual(self.tables_page_status(), "PREPARING")
        self.ok(self.chef, f"/api/restaurants/orders/{oid}/mark-prepared/")
        self.assertEqual(self.tables_page_status(), "READY")
        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/mark-served/")

        self.assertIn(oid, self.waiter_cash_ids())
        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/cash-receive/")
        self.assertNotIn(oid, self.waiter_cash_ids())
        self.assertIn(oid, self.manager_cash_ids())
        self.assertEqual(self.tables_page_status(), "PAYMENT_PENDING")
        self.assertEqual(self.active_tables(), 1)
        self.assertEqual(float(self.net_sales()), 0)

        self.ok(self.manager, f"/api/restaurants/orders/{oid}/cash-settle/")
        self.assertNotIn(oid, self.manager_cash_ids())
        self.assertEqual(float(self.net_sales()), 450.0)
        self.assertEqual(self.active_tables(), 0)
        self.assertEqual(self.tables_page_status(), "EMPTY")
        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.EMPTY.value)
        self.assertFalse(DineInSession.objects.filter(table=self.table, status=DineInSessionStatus.ACTIVE.value).exists())

        # The next guests can scan Table 1 straight away.
        self.start_session()

    def test_customer_orders_page_remembers_cash_request(self):
        token = self.start_session()
        oid = self.place_dine_in(token)
        self.ok(self.customer, f"/api/restaurants/orders/{oid}/cash-request/")
        order = [o for o in rows(self.get(self.customer, "/api/restaurants/orders/")) if o["id"] == oid][0]
        self.assertTrue(order["cash_requested"])


class StuckTableTests(OrderFlowBase):
    def test_abandoned_checkout_does_not_keep_table_busy_after_settlement(self):
        token = self.start_session()
        abandoned = self.place_dine_in(token)
        Orders.objects.filter(id=abandoned).update(created_at=timezone.now() - timedelta(hours=1))
        oid = self.place_dine_in(token)
        self.ok(self.customer, f"/api/restaurants/orders/{oid}/cash-request/")
        self.to_served(oid)
        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/cash-receive/")
        self.ok(self.manager, f"/api/restaurants/orders/{oid}/cash-settle/")

        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.EMPTY.value)
        self.assertEqual(self.active_tables(), 0)
        self.start_session()

    def test_served_order_without_cash_request_can_still_be_collected(self):
        # Data from before payment had to be chosen first: served, unpaid,
        # no payment record. It used to keep the table active with nothing
        # for the waiter to click.
        token = self.start_session()
        oid = self.place_dine_in(token)
        self.to_served(oid)
        self.assertEqual(self.active_tables(), 1)
        self.assertIn(oid, self.waiter_cash_ids())
        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/cash-receive/")
        self.ok(self.manager, f"/api/restaurants/orders/{oid}/cash-settle/")
        self.assertEqual(self.active_tables(), 0)
        self.assertEqual(self.tables_page_status(), "EMPTY")

    def test_table_stuck_busy_after_settlement_heals_on_dashboard_load(self):
        token = self.start_session()
        oid = self.place_dine_in(token)
        self.ok(self.customer, f"/api/restaurants/orders/{oid}/cash-request/")
        self.to_served(oid)
        self.pay_cash_after_request(oid)
        # Simulate the state left behind by the old code.
        type(self.table).objects.filter(id=self.table.id).update(
            table_state=TableState.PAYMENT_PENDING.value, customer_count=2
        )
        self.assertEqual(self.active_tables(), 0)
        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.EMPTY.value)

    def test_heal_tables_command(self):
        type(self.table).objects.filter(id=self.table.id).update(table_state=TableState.SERVED.value)
        out = StringIO()
        call_command("heal_tables", "--dry-run", stdout=out)
        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.SERVED.value)
        self.assertIn("1 table(s) would be freed", out.getvalue())
        call_command("heal_tables", stdout=StringIO())
        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.EMPTY.value)

    def test_resaving_old_paid_order_does_not_free_next_guests(self):
        token = self.start_session()
        oid = self.place_dine_in(token)
        self.ok(self.customer, f"/api/restaurants/orders/{oid}/cash-request/")
        self.to_served(oid)
        self.pay_cash_after_request(oid)

        self.start_session()  # next guests sit down
        Orders.objects.get(id=oid).save()  # e.g. a review touches the old order
        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.OCCUPIED.value)
        self.assertEqual(self.active_tables(), 1)

    def test_fresh_checkout_keeps_table_busy(self):
        token = self.start_session()
        self.place_dine_in(token)
        self.assertEqual(self.active_tables(), 1)
        self.assertEqual(self.tables_page_status(), "ORDER_PLACED")

    def pay_cash_after_request(self, oid):
        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/cash-receive/")
        self.ok(self.manager, f"/api/restaurants/orders/{oid}/cash-settle/")


class CheckoutAfterSettlementTests(OrderFlowBase):
    def test_old_session_token_gets_clear_409_not_404(self):
        token = self.start_session()
        oid = self.place_dine_in(token)
        self.ok(self.customer, f"/api/restaurants/orders/{oid}/cash-request/")
        self.to_served(oid)
        self.ok(self.waiter, f"/api/restaurants/orders/{oid}/cash-receive/")
        self.ok(self.manager, f"/api/restaurants/orders/{oid}/cash-settle/")

        # The customer's browser still holds the closed session's token.
        self.as_user(self.customer)
        res = self.client.post(
            "/api/restaurants/orders/checkout-order/",
            {
                "order_type": "DINE_IN",
                "restaurant": self.restaurant.id,
                "table": 1,
                "guests": 2,
                "session_token": token,
                "items": [{"menu_item": self.burger.id, "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 409, res.data)
        self.assertEqual(res.data["code"], "dine_in_session_ended")

        # Scanning again gives a new session that checks out normally.
        self.place_dine_in(self.start_session())
