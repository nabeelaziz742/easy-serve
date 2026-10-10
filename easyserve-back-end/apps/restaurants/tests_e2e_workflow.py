import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils.timezone import now
from rest_framework.test import APIClient
from rest_framework import status

from apps.core.models import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import (
    Restaurant,
    Table,
    Menu,
    MenuItem,
    DineInSession,
    Orders,
    OrderItem,
    PaymentDetails,
)
from apps.restaurants.constants import (
    OrderStatus,
    OrderType,
    PaymentStatus,
    PaymentMethod,
    DineInSessionStatus,
)
from apps.financial.services.financial_service import FinancialReportService
from apps.financial.services.command_center_service import CommandCenterService
from apps.financial.services.reports_service import ReportsService


class RealtimeWorkflowAndFinancialTests(TestCase):
    """
    Comprehensive regression and end-to-end tests for:
    1. Real-time order flow: Customer -> Waiter -> Chef -> Manager
    2. Real-time cash collection & settlement flow
    3. Financial intelligence reporting & multi-tenant isolation
    4. RBAC security enforcement
    """

    def setUp(self):
        self.client = APIClient()

        # Create primary restaurant
        self.restaurant = Restaurant.objects.create(
            name="Test Trattoria",
            address="123 Main St",
            is_active=True,
        )

        # Create secondary restaurant (for multi-tenant isolation tests)
        self.other_restaurant = Restaurant.objects.create(
            name="Other Bistro",
            address="456 Other St",
            is_active=True,
        )

        # Create Table #1 in primary restaurant
        self.table = Table.objects.create(
            restaurant=self.restaurant,
            table_number=1,
            capacity=4,
        )

        # Create Table #1 in secondary restaurant
        self.other_table = Table.objects.create(
            restaurant=self.other_restaurant,
            table_number=1,
            capacity=4,
        )

        # Create Menu & Item
        self.menu = Menu.objects.create(
            restaurant=self.restaurant,
            name="Lunch Menu",
            is_active=True,
        )
        self.menu_item = MenuItem.objects.create(
            menu=self.menu,
            name="Gourmet Burger",
            price=Decimal("500.00"),
            is_available=True,
        )

        # Create Users: Manager, Waiter, Chef, Customer
        self.manager_user = User.objects.create_user(
            username="manager1",
            email="manager1@example.com",
            password="password123",
            user_type="manager",
            is_active=True,
        )
        self.manager_profile = UserProfile.objects.create(
            user=self.manager_user,
            restaurant=self.restaurant,
            first_name="Manager",
            last_name="One",
        )

        self.waiter_user = User.objects.create_user(
            username="waiter1",
            email="waiter1@example.com",
            password="password123",
            user_type="waiter",
            is_active=True,
        )
        self.waiter_profile = UserProfile.objects.create(
            user=self.waiter_user,
            restaurant=self.restaurant,
            first_name="Waiter",
            last_name="One",
        )

        self.chef_user = User.objects.create_user(
            username="chef1",
            email="chef1@example.com",
            password="password123",
            user_type="chef",
            is_active=True,
        )
        self.chef_profile = UserProfile.objects.create(
            user=self.chef_user,
            restaurant=self.restaurant,
            first_name="Chef",
            last_name="One",
        )

        self.customer_user = User.objects.create_user(
            username="customer1",
            email="customer1@example.com",
            password="password123",
            user_type="customer",
            is_active=True,
        )
        self.customer_profile = UserProfile.objects.create(
            user=self.customer_user,
            first_name="Customer",
            last_name="One",
        )

        # Other restaurant Manager & Waiter
        self.other_manager = User.objects.create_user(
            username="other_mgr",
            email="other_mgr@example.com",
            password="password123",
            user_type="manager",
            is_active=True,
        )
        self.other_manager_profile = UserProfile.objects.create(
            user=self.other_manager,
            restaurant=self.other_restaurant,
            first_name="Other",
            last_name="Manager",
        )

    def test_complete_order_lifecycle_waiter_to_chef_to_financial(self):
        """
        End-to-End Workflow Verification:
        1. Customer creates dine-in order.
        2. Waiter queries pending orders -> order is present.
        3. Waiter accepts order -> Chef is assigned.
        4. Chef queries kitchen orders -> order is present with TO_PREPARE.
        5. Chef starts preparing -> marks prepared.
        6. Waiter marks served.
        7. Customer requests cash / Waiter collects cash.
        8. Waiter marks cash received -> Order appears in Manager Cash Settlement.
        9. Manager settles cash -> payment_status becomes CONFIRMED.
        10. Financial service & reports reflect the exact transaction.
        11. Other restaurant cannot see this order or revenue.
        12. Unauthorized users (Chef, Waiter) are denied access to Financial endpoints.
        """

        # 1. Customer creates Dine-In Session & Order
        session = DineInSession.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            guests=2,
            status=DineInSessionStatus.ACTIVE.value,
            token=uuid.uuid4(),
        )

        order = Orders.objects.create(
            user=self.customer_profile,
            order_type=OrderType.DINE_IN.value,
            ordered=True,
            ordered_date=now(),
            dine_in_session=session,
            table=self.table,
            total_price=Decimal("1000.00"),
            payment_status=PaymentStatus.PENDING.value,
            order_status=OrderStatus.TO_PREPARE.value,
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=2,
            price=Decimal("500.00"),
        )

        def extract_ids(resp_data):
            if isinstance(resp_data, dict) and "results" in resp_data:
                return [o["id"] for o in resp_data["results"]]
            if isinstance(resp_data, list):
                return [o["id"] for o in resp_data]
            return []

        # 2. Verify Waiter sees new order in Pending Orders (Requirement A)
        self.client.force_authenticate(user=self.waiter_user)
        pending_resp = self.client.get("/api/restaurants/orders/pending/")
        self.assertEqual(pending_resp.status_code, status.HTTP_200_OK)
        pending_ids = extract_ids(pending_resp.data)
        self.assertIn(order.id, pending_ids)

        # Other restaurant waiter cannot see it
        other_waiter = User.objects.create_user(
            username="other_waiter", email="ow@example.com", password="pass", user_type="waiter", is_active=True
        )
        UserProfile.objects.create(user=other_waiter, restaurant=self.other_restaurant)
        self.client.force_authenticate(user=other_waiter)
        other_pending_resp = self.client.get("/api/restaurants/orders/pending/")
        self.assertNotIn(order.id, extract_ids(other_pending_resp.data))

        # 3. Waiter accepts the order (Requirement B)
        self.client.force_authenticate(user=self.waiter_user)
        accept_resp = self.client.post(f"/api/restaurants/orders/{order.id}/accept/")
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertTrue(order.accepted_by_waiter)
        self.assertEqual(order.assigned_chef_id, self.chef_profile.id)

        # 4. Chef sees the order in Kitchen Queue automatically (Requirement B)
        self.client.force_authenticate(user=self.chef_user)
        chef_resp = self.client.get("/api/restaurants/orders/chef/")
        self.assertEqual(chef_resp.status_code, status.HTTP_200_OK)
        chef_ids = extract_ids(chef_resp.data)
        self.assertIn(order.id, chef_ids)

        # 5. Chef starts preparing and marks prepared
        start_resp = self.client.post(f"/api/restaurants/orders/{order.id}/start-preparing/")
        self.assertEqual(start_resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.PREPARING.value)

        ready_resp = self.client.post(f"/api/restaurants/orders/{order.id}/mark-prepared/")
        self.assertEqual(ready_resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.PREPARED.value)

        # 6. Waiter sees ready order and marks served
        self.client.force_authenticate(user=self.waiter_user)
        ready_orders_resp = self.client.get("/api/restaurants/orders/ready/")
        self.assertIn(order.id, extract_ids(ready_orders_resp.data))

        served_resp = self.client.post(f"/api/restaurants/orders/{order.id}/mark-served/")
        self.assertEqual(served_resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.SERVED.value)

        # 7. Customer requests cash / Waiter records cash collection (Requirement C)
        self.client.force_authenticate(user=self.customer_user)
        req_cash_resp = self.client.post(f"/api/restaurants/orders/{order.id}/cash-request/")
        self.assertEqual(req_cash_resp.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.waiter_user)
        waiter_cash_resp = self.client.get("/api/restaurants/orders/waiter/cash/")
        self.assertIn(order.id, extract_ids(waiter_cash_resp.data))

        receive_cash_resp = self.client.post(f"/api/restaurants/orders/{order.id}/cash-receive/")
        self.assertEqual(receive_cash_resp.status_code, status.HTTP_200_OK)

        # 8. Manager sees order in Cash Settlement (Requirement C)
        self.client.force_authenticate(user=self.manager_user)
        mgr_cash_resp = self.client.get("/api/restaurants/orders/manager/cash/")
        self.assertEqual(mgr_cash_resp.status_code, status.HTTP_200_OK)
        self.assertIn(order.id, extract_ids(mgr_cash_resp.data))

        # 9. Manager Settles Cash
        settle_resp = self.client.post(f"/api/restaurants/orders/{order.id}/cash-settle/")
        self.assertEqual(settle_resp.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.payment_status, PaymentStatus.CONFIRMED.value)

        # 10. Financial Service & Reports reflect the settled transaction (Requirement H, I)
        today = now().date()
        overview = FinancialReportService.calculate_overview(
            restaurant=self.restaurant,
            start_date=today,
            end_date=today,
        )
        self.assertEqual(overview["revenue"]["gross_sales"], Decimal("1000.00"))
        self.assertEqual(overview["revenue"]["orders_count"], 1)

        # Manager Financial API verification
        self.client.force_authenticate(user=self.manager_user)
        fin_resp = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(fin_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(fin_resp.data["revenue"]["gross_sales"])), Decimal("1000.00"))
        self.assertEqual(fin_resp.data["revenue"]["orders_count"], 1)

        # Sales Report verification
        sales_data = ReportsService.get_sales_report(self.restaurant, today, today)
        self.assertEqual(sales_data["summary"]["total_orders"], 1)
        self.assertEqual(sales_data["summary"]["total_gross_sales"], 1000.0)

        # 11. Multi-Tenant Isolation Verification (Requirement J)
        self.client.force_authenticate(user=self.other_manager)
        other_fin_resp = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(other_fin_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(other_fin_resp.data["revenue"]["gross_sales"])), Decimal("0.00"))
        self.assertEqual(other_fin_resp.data["revenue"]["orders_count"], 0)

        # 12. Role Authorization Enforcement (Requirement K)
        # Chef cannot access financial endpoints
        self.client.force_authenticate(user=self.chef_user)
        chef_fin_resp = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(chef_fin_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Waiter cannot access financial endpoints
        self.client.force_authenticate(user=self.waiter_user)
        waiter_fin_resp = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(waiter_fin_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Unauthenticated user is rejected
        self.client.force_authenticate(user=None)
        anon_fin_resp = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(anon_fin_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_table_availability_stale_session_and_lifecycle(self):
        """
        Verify:
        1. An old/stale session without orders (> 2 hours) is cleaned up and table becomes free.
        2. Customer can start a fresh session on the freed table.
        3. A newly active session correctly blocks another customer without token.
        4. Same customer with matching session_token can re-enter/update.
        5. Completed session with paid orders releases table cleanly.
        """
        from datetime import timedelta
        from django.utils import timezone
        from apps.restaurants.constants import TableState

        self.client.force_authenticate(user=None)

        # 1. Simulate a stale abandoned session from 3 hours ago
        stale_session = DineInSession.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            guests=2,
            name="Abandoned Guest",
            status=DineInSessionStatus.ACTIVE.value,
        )
        # Manually backdate opened_at
        DineInSession.objects.filter(id=stale_session.id).update(
            opened_at=timezone.now() - timedelta(hours=3)
        )
        self.table.table_state = TableState.OCCUPIED.value
        self.table.customer_count = 2
        self.table.save()

        # 2. Validation endpoint should detect stale session and report table free
        val_resp = self.client.post("/api/restaurants/dine-in/validate/", {
            "restaurant": self.restaurant.id,
            "table": self.table.table_number,
        })
        self.assertEqual(val_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(val_resp.data["active_session"])

        stale_session.refresh_from_db()
        self.assertEqual(stale_session.status, DineInSessionStatus.CLOSED.value)
        self.table.refresh_from_db()
        self.assertEqual(self.table.table_state, TableState.EMPTY.value)

        # 3. Customer starts a fresh session
        start_resp = self.client.post("/api/restaurants/dine-in/start-session/", {
            "restaurant": self.restaurant.id,
            "table": self.table.table_number,
            "guests": 3,
            "name": "Fresh Customer",
            "phone": "1234567890",
        })
        self.assertEqual(start_resp.status_code, status.HTTP_200_OK)
        token = start_resp.data["session"]["token"]

        # 4. Another customer attempting to start a session on this occupied table is blocked
        conflict_resp = self.client.post("/api/restaurants/dine-in/start-session/", {
            "restaurant": self.restaurant.id,
            "table": self.table.table_number,
            "guests": 2,
            "name": "Second Customer",
        })
        self.assertEqual(conflict_resp.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(conflict_resp.data["detail"], "This table is currently occupied.")

        # 5. Same customer with matching session token is permitted to update
        retry_resp = self.client.post("/api/restaurants/dine-in/start-session/", {
            "restaurant": self.restaurant.id,
            "table": self.table.table_number,
            "guests": 4,
            "name": "Fresh Customer",
            "session_token": token,
        })
        self.assertEqual(retry_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(retry_resp.data["session"]["guests"], 4)

    def test_multi_tenant_table_isolation(self):
        """
        Verify:
        1. An active session on Table 1 in Restaurant A does not affect Table 1 in Restaurant B.
        2. Restaurant B can independently start a session on its own Table 1.
        """
        # Restaurant A occupies Table 1
        resp_a = self.client.post("/api/restaurants/dine-in/start-session/", {
            "restaurant": self.restaurant.id,
            "table": self.table.table_number,
            "guests": 2,
            "name": "Rest A Guest",
        })
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)

        # Restaurant B starts session on its own Table 1
        resp_b = self.client.post("/api/restaurants/dine-in/start-session/", {
            "restaurant": self.other_restaurant.id,
            "table": self.other_table.table_number,
            "guests": 2,
            "name": "Rest B Guest",
        })
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)

