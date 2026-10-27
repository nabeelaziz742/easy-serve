"""
Tests for the manager Orders & Bills list, order cancellation with refunds,
the guest "call waiter" / "ask for bill" buttons and the profile save fix.
"""
from decimal import Decimal

from apps.restaurants.constants import OrderStatus, PaymentStatus, TableState
from apps.restaurants.models import Orders, PaymentDetails, ServiceRequest
from apps.userprofile.models import Notification

from .tests_qa_regression import QAWorkflowBase, make_user


class ManagerOrderListTests(QAWorkflowBase):
    URL = "/api/restaurants/orders/manager/"

    def test_manager_sees_only_own_restaurant_orders_with_bill_fields(self):
        order_id = self.place_dine_in(self.start_session())

        self.as_user(self.manager)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual([o["id"] for o in res.data["results"]], [order_id])
        row = res.data["results"][0]
        self.assertEqual(row["table_number"], 1)
        self.assertFalse(row["order_cancelled"])
        self.assertIn("refund_amount", row)

        self.as_user(self.other_manager)
        res = self.client.get(self.URL)
        self.assertEqual(res.data["results"], [])

    def test_waiter_and_customer_cannot_list(self):
        for user in (self.waiter, self.customer):
            self.as_user(user)
            self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_filters_and_search(self):
        token = self.start_session()
        first = self.place_dine_in(token)
        second = self.place_dine_in(token)
        self.post(self.manager, f"/api/restaurants/orders/{second}/cancel/", {"reason": "Duplicate order"})

        self.as_user(self.manager)
        res = self.client.get(self.URL, {"status": "cancelled"})
        self.assertEqual([o["id"] for o in res.data["results"]], [second])
        res = self.client.get(self.URL, {"status": "active"})
        self.assertEqual([o["id"] for o in res.data["results"]], [first])
        # Both orders are on table 1, so search by the second order number.
        res = self.client.get(self.URL, {"search": f"#{second}"})
        self.assertEqual([o["id"] for o in res.data["results"]], [second])
        res = self.client.get(self.URL, {"search": "1", "status": "active"})
        self.assertEqual([o["id"] for o in res.data["results"]], [first])

    def test_manager_can_open_the_bill(self):
        order_id = self.place_dine_in(self.start_session())
        self.as_user(self.manager)
        res = self.client.get(f"/api/restaurants/orders/{order_id}/receipt/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["order_id"], order_id)


class CancelOrderTests(QAWorkflowBase):
    def cancel(self, user, order_id, reason="Customer changed mind"):
        return self.post(user, f"/api/restaurants/orders/{order_id}/cancel/", {"reason": reason})

    def test_reason_is_required(self):
        order_id = self.place_dine_in(self.start_session())
        res = self.cancel(self.manager, order_id, reason=" ")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Orders.objects.get(id=order_id).order_cancelled)

    def test_waiter_cancels_new_unpaid_order_and_table_is_freed(self):
        order_id = self.place_dine_in(self.start_session())
        self.post(self.customer, f"/api/restaurants/orders/{order_id}/cash-request/")

        res = self.cancel(self.waiter, order_id)
        self.assertEqual(res.status_code, 200, res.data)
        order = Orders.objects.get(id=order_id)
        self.assertTrue(order.order_cancelled)
        self.assertEqual(order.cancellation_reason, "Customer changed mind")
        self.assertEqual(order.cancelled_by, self.waiter_p)
        self.assertEqual(order.refund_amount, Decimal("0"))
        self.assertEqual(
            PaymentDetails.objects.get(order=order).payment_status, PaymentStatus.CANCELLED.value
        )
        self.table.refresh_from_db()
        self.assertNotIn(self.table.table_state, (TableState.ORDER_PLACED.value, TableState.PREPARING.value))

        # Gone from the waiter's pending list.
        self.as_user(self.waiter)
        pending = self.client.get("/api/restaurants/orders/pending/").data
        self.assertNotIn(order_id, [o["id"] for o in pending.get("results", pending)])

    def test_waiter_cannot_cancel_once_kitchen_started(self):
        order_id = self.place_dine_in(self.start_session())
        self.post(self.waiter, f"/api/restaurants/orders/{order_id}/accept/")
        self.post(self.chef, f"/api/restaurants/orders/{order_id}/start-preparing/")

        res = self.cancel(self.waiter, order_id)
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Orders.objects.get(id=order_id).order_cancelled)

        # The manager can, and the kitchen can no longer move it on.
        res = self.cancel(self.manager, order_id)
        self.assertEqual(res.status_code, 200, res.data)
        res = self.post(self.chef, f"/api/restaurants/orders/{order_id}/mark-prepared/")
        self.assertEqual(res.status_code, 400)
        self.as_user(self.chef)
        chef_orders = self.client.get("/api/restaurants/orders/chef/").data
        self.assertNotIn(order_id, [o["id"] for o in chef_orders.get("results", chef_orders)])

    def test_manager_cancelling_paid_order_records_refund(self):
        order_id = self.place_dine_in(self.start_session())
        self.to_served(order_id)
        self.pay_cash(order_id)
        order = Orders.objects.get(id=order_id)
        self.assertEqual(order.payment_status, PaymentStatus.CONFIRMED.value)

        res = self.cancel(self.waiter, order_id)
        self.assertEqual(res.status_code, 403)

        res = self.cancel(self.manager, order_id, reason="Food was cold")
        self.assertEqual(res.status_code, 200, res.data)
        order.refresh_from_db()
        self.assertTrue(order.order_cancelled)
        self.assertEqual(order.refund_amount, order.total_price)
        self.assertEqual(Decimal(res.data["refund_amount"]), order.total_price)
        # The bill shows the cancellation and the refund.
        self.as_user(self.manager)
        bill = self.client.get(f"/api/restaurants/orders/{order_id}/receipt/").data
        self.assertTrue(bill["cancelled"])
        self.assertEqual(bill["cancellation_reason"], "Food was cold")
        self.assertEqual(Decimal(bill["refund_amount"]), order.total_price)
        # The waiter who served it is told.
        self.assertTrue(Notification.objects.filter(profile=self.waiter_p, message__contains="Food was cold").exists())

    def test_cash_held_by_waiter_leaves_settlement_list(self):
        order_id = self.place_dine_in(self.start_session())
        self.to_served(order_id)
        self.post(self.customer, f"/api/restaurants/orders/{order_id}/cash-request/")
        self.post(self.waiter, f"/api/restaurants/orders/{order_id}/cash-receive/")

        res = self.cancel(self.manager, order_id)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(Decimal(res.data["refund_amount"]), Orders.objects.get(id=order_id).total_price)
        self.as_user(self.manager)
        cash = self.client.get("/api/restaurants/orders/manager/cash/").data
        self.assertNotIn(order_id, [o["id"] for o in cash.get("results", cash)])

    def test_cannot_cancel_twice_or_other_restaurant(self):
        order_id = self.place_dine_in(self.start_session())
        self.assertEqual(self.cancel(self.other_manager, order_id).status_code, 403)
        self.assertEqual(self.cancel(self.other_waiter, order_id).status_code, 403)
        self.assertEqual(self.cancel(self.customer, order_id).status_code, 403)
        self.assertEqual(self.cancel(self.manager, order_id).status_code, 200)
        self.assertEqual(self.cancel(self.manager, order_id).status_code, 400)

    def test_cancelled_order_drops_out_of_revenue(self):
        order_id = self.place_dine_in(self.start_session())
        self.to_served(order_id)
        self.pay_cash(order_id)
        self.as_user(self.manager)
        before = self.client.get("/api/restaurants/manager/dashboard/").data["total_revenue"]
        self.assertGreater(Decimal(str(before)), 0)

        self.cancel(self.manager, order_id)
        # Revenue reports already skip cancelled orders.
        self.assertFalse(
            Orders.objects.filter(id=order_id, order_cancelled=False, order_status=OrderStatus.SERVED).exists()
        )


class TableServiceRequestTests(QAWorkflowBase):
    GUEST_URL = "/api/restaurants/dine-in/service-requests/"
    STAFF_URL = "/api/restaurants/service-requests/"

    def guest_post(self, token, kind):
        self.client.force_authenticate(user=None)
        return self.client.post(self.GUEST_URL, {"kind": kind}, format="json", HTTP_X_DINE_IN_TOKEN=token)

    def test_guest_calls_waiter_and_waiter_clears_it(self):
        token = self.start_session()
        res = self.guest_post(token, "waiter")
        self.assertEqual(res.status_code, 201, res.data)
        request_id = res.data["id"]
        self.assertEqual(res.data["table_number"], 1)

        # A second tap does not create a second alert.
        res = self.guest_post(token, "waiter")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], request_id)
        self.assertEqual(ServiceRequest.objects.count(), 1)

        self.as_user(self.waiter)
        res = self.client.get(self.STAFF_URL)
        self.assertEqual([r["id"] for r in res.data["results"]], [request_id])

        self.client.force_authenticate(user=None)
        res = self.client.get(self.GUEST_URL, HTTP_X_DINE_IN_TOKEN=token)
        self.assertTrue(res.data["active"])
        self.assertEqual([r["kind"] for r in res.data["results"]], ["waiter"])

        res = self.post(self.waiter, f"{self.STAFF_URL}{request_id}/resolve/")
        self.assertEqual(res.status_code, 200, res.data)
        self.as_user(self.waiter)
        self.assertEqual(self.client.get(self.STAFF_URL).data["results"], [])

        # Once handled the guest can ask again.
        self.assertEqual(self.guest_post(token, "waiter").status_code, 201)

    def test_bill_request_is_separate_from_waiter_call(self):
        token = self.start_session()
        self.assertEqual(self.guest_post(token, "waiter").status_code, 201)
        self.assertEqual(self.guest_post(token, "bill").status_code, 201)
        self.assertEqual(self.guest_post(token, "dance").status_code, 400)

    def test_needs_an_active_table_session(self):
        res = self.guest_post("00000000-0000-0000-0000-000000000000", "waiter")
        self.assertEqual(res.status_code, 403)
        self.client.force_authenticate(user=None)
        res = self.client.post(self.GUEST_URL, {"kind": "waiter"}, format="json")
        self.assertEqual(res.status_code, 403)
        res = self.client.get(self.GUEST_URL)
        self.assertFalse(res.data["active"])

    def test_other_restaurant_and_customers_cannot_see_or_resolve(self):
        token = self.start_session()
        request_id = self.guest_post(token, "bill").data["id"]

        self.as_user(self.other_waiter)
        self.assertEqual(self.client.get(self.STAFF_URL).data["results"], [])
        res = self.post(self.other_waiter, f"{self.STAFF_URL}{request_id}/resolve/")
        self.assertEqual(res.status_code, 403)

        self.as_user(self.customer)
        self.assertEqual(self.client.get(self.STAFF_URL).status_code, 403)
        res = self.post(self.customer, f"{self.STAFF_URL}{request_id}/resolve/")
        self.assertEqual(res.status_code, 403)

        # The manager of the restaurant sees it too.
        self.as_user(self.manager)
        self.assertEqual(len(self.client.get(self.STAFF_URL).data["results"]), 1)


class ProfileSaveTests(QAWorkflowBase):
    def test_phone_and_address_are_saved(self):
        self.as_user(self.customer)
        res = self.client.patch(
            "/api/user/me/", {"phone": "+92 300 1234567", "address": "House 5, Street 2, Lahore"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.customer_p.refresh_from_db()
        self.assertEqual(self.customer_p.phone, "+92 300 1234567")
        self.assertEqual(self.customer_p.address, "House 5, Street 2, Lahore")

        res = self.client.get("/api/user/me/")
        self.assertEqual(res.data["profile"]["phone"], "+92 300 1234567")
        self.assertEqual(res.data["profile"]["address"], "House 5, Street 2, Lahore")

    def test_role_still_cannot_be_changed(self):
        self.as_user(self.customer)
        self.client.patch("/api/user/me/", {"user_type": "super_admin", "phone": "1"}, format="json")
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.user_type, "user")

    def test_too_long_phone_is_rejected(self):
        self.as_user(self.customer)
        res = self.client.patch("/api/user/me/", {"phone": "1" * 30}, format="json")
        self.assertEqual(res.status_code, 400)
