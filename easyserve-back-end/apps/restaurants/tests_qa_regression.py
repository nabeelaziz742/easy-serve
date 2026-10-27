"""
Regression tests for defects found in the QA audit of the live order,
payment and settlement workflow (see QA_ENGINEERING_PROGRESS.md).

Each test drives the same API endpoints the Customer / Waiter / Chef /
Manager dashboards call.
"""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import (
    Restaurant,
    Table,
    Menu,
    MenuItem,
    DineInSession,
    Orders,
    PaymentDetails,
)
from apps.restaurants.constants import (
    OrderStatus,
    PaymentStatus,
    DineInSessionStatus,
    TableState,
)
from apps.inventory.models import InventoryCategory, UnitOfMeasure, InventoryItem, StockMovementLog
from apps.recipes.models import Recipe, RecipeItem


def make_user(email, user_type, restaurant=None):
    user = User.objects.create_user(
        username=email, email=email, password="password123", user_type=user_type, is_active=True,
    )
    profile = UserProfile.objects.create(
        user=user, restaurant=restaurant, first_name=user_type.title(), last_name="QA",
    )
    return user, profile


class QAWorkflowBase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="QA Alpha", is_active=True)
        self.other = Restaurant.objects.create(name="QA Beta", is_active=True)

        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=4)
        self.other_table = Table.objects.create(restaurant=self.other, table_number=1, capacity=4)

        menu = Menu.objects.create(restaurant=self.restaurant, name="Main", is_active=True)
        self.burger = MenuItem.objects.create(menu=menu, name="Burger", price=Decimal("450.00"), is_available=True)
        self.tea = MenuItem.objects.create(menu=menu, name="Tea", price=Decimal("80.50"), is_available=True)
        self.sold_out = MenuItem.objects.create(menu=menu, name="Sold out", price=Decimal("10.00"), is_available=False)
        other_menu = Menu.objects.create(restaurant=self.other, name="Main", is_active=True)
        self.other_item = MenuItem.objects.create(menu=other_menu, name="Pasta", price=Decimal("300.00"), is_available=True)

        self.manager, self.manager_p = make_user("manager@alpha.qa", "manager", self.restaurant)
        self.waiter, self.waiter_p = make_user("waiter@alpha.qa", "waiter", self.restaurant)
        self.chef, self.chef_p = make_user("chef@alpha.qa", "chef", self.restaurant)
        self.customer, self.customer_p = make_user("customer@qa.qa", "user")
        self.customer2, self.customer2_p = make_user("customer2@qa.qa", "user")

        self.other_manager, _ = make_user("manager@beta.qa", "manager", self.other)
        self.other_waiter, _ = make_user("waiter@beta.qa", "waiter", self.other)
        self.other_chef, _ = make_user("chef@beta.qa", "chef", self.other)

    # -- helpers -------------------------------------------------------

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def start_session(self, guests=2):
        self.client.force_authenticate(user=None)
        res = self.client.post(
            "/api/restaurants/dine-in/start-session/",
            {"restaurant": self.restaurant.id, "table": 1, "key": self.table.qr_key, "guests": guests},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        return res.data["session"]["token"]

    def place_dine_in(self, token, items=None, user=None):
        self.as_user(user or self.customer)
        res = self.client.post(
            "/api/restaurants/orders/checkout-order/",
            {
                "order_type": "DINE_IN",
                "restaurant": self.restaurant.id,
                "table": 1,
                "guests": 2,
                "session_token": token,
                "items": items or [{"menu_item": self.burger.id, "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        return res.data["id"]

    def post(self, user, url, data=None):
        self.as_user(user)
        return self.client.post(url, data or {}, format="json")

    def to_served(self, order_id):
        for user, step in (
            (self.waiter, "accept"),
            (self.chef, "start-preparing"),
            (self.chef, "mark-prepared"),
            (self.waiter, "mark-served"),
        ):
            res = self.post(user, f"/api/restaurants/orders/{order_id}/{step}/")
            self.assertEqual(res.status_code, 200, (step, res.data))

    def pay_cash(self, order_id, customer=None):
        res = self.post(customer or self.customer, f"/api/restaurants/orders/{order_id}/cash-request/")
        self.assertEqual(res.status_code, 200, res.data)
        res = self.post(self.waiter, f"/api/restaurants/orders/{order_id}/cash-receive/")
        self.assertEqual(res.status_code, 200, res.data)
        res = self.post(self.manager, f"/api/restaurants/orders/{order_id}/cash-settle/")
        self.assertEqual(res.status_code, 200, res.data)


class ChefMarkPreparedConsumesRecipeStockTests(QAWorkflowBase):
    """QA-03: the chef's live 'Mark Ready' endpoint must run BOM consumption."""

    def setUp(self):
        super().setUp()
        uom = UnitOfMeasure.objects.create(restaurant=self.restaurant, name="Piece", short_code="pcs")
        cat = InventoryCategory.objects.create(restaurant=self.restaurant, name="Raw")
        self.bun = InventoryItem.objects.create(
            restaurant=self.restaurant, category=cat, name="Bun", uom=uom,
            current_stock=Decimal("10.000"), cost_per_unit=Decimal("30.00"),
        )
        recipe = Recipe.objects.create(restaurant=self.restaurant, menu_item=self.burger, yield_servings=Decimal("1.00"), is_active=True)
        RecipeItem.objects.create(recipe=recipe, inventory_item=self.bun, quantity_required=Decimal("1.000"), uom=uom)

    def test_mark_prepared_deducts_stock_and_records_cogs_once(self):
        order_id = self.place_dine_in(self.start_session(), [{"menu_item": self.burger.id, "quantity": 2}])
        self.post(self.waiter, f"/api/restaurants/orders/{order_id}/accept/")
        self.post(self.chef, f"/api/restaurants/orders/{order_id}/start-preparing/")
        res = self.post(self.chef, f"/api/restaurants/orders/{order_id}/mark-prepared/")
        self.assertEqual(res.status_code, 200, res.data)

        order = Orders.objects.get(id=order_id)
        self.bun.refresh_from_db()
        self.assertTrue(order.inventory_deducted)
        self.assertEqual(order.total_cogs, Decimal("60.00"))
        self.assertEqual(self.bun.current_stock, Decimal("8.000"))
        self.assertEqual(StockMovementLog.objects.filter(inventory_item=self.bun).count(), 1)

        # A repeated click is rejected and never deducts twice.
        res = self.post(self.chef, f"/api/restaurants/orders/{order_id}/mark-prepared/")
        self.assertEqual(res.status_code, 400)
        self.bun.refresh_from_db()
        self.assertEqual(self.bun.current_stock, Decimal("8.000"))

    def test_insufficient_stock_keeps_order_preparing(self):
        self.bun.current_stock = Decimal("1.000")
        self.bun.save()
        order_id = self.place_dine_in(self.start_session(), [{"menu_item": self.burger.id, "quantity": 2}])
        self.post(self.waiter, f"/api/restaurants/orders/{order_id}/accept/")
        self.post(self.chef, f"/api/restaurants/orders/{order_id}/start-preparing/")
        res = self.post(self.chef, f"/api/restaurants/orders/{order_id}/mark-prepared/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Orders.objects.get(id=order_id).order_status, OrderStatus.PREPARING)
        self.bun.refresh_from_db()
        self.assertEqual(self.bun.current_stock, Decimal("1.000"))


class SessionWithSeveralOrdersTests(QAWorkflowBase):
    """QA-04: settling one order must not free a table that still owes money."""

    def test_settling_first_order_keeps_table_and_session_for_unpaid_second_order(self):
        token = self.start_session()
        first = self.place_dine_in(token)
        second = self.place_dine_in(token, [{"menu_item": self.tea.id, "quantity": 1}])
        self.to_served(first)
        self.pay_cash(first)

        session = DineInSession.objects.get(token=token)
        self.table.refresh_from_db()
        self.assertEqual(session.status, DineInSessionStatus.ACTIVE.value)
        self.assertNotEqual(self.table.table_state, TableState.EMPTY.value)

        # Nobody else can take the table while the second order is unpaid.
        self.client.force_authenticate(user=None)
        res = self.client.post(
            "/api/restaurants/dine-in/start-session/",
            {"restaurant": self.restaurant.id, "table": 1, "key": self.table.qr_key, "guests": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 409)

        # Once the last order is settled the table is released.
        self.to_served(second)
        self.pay_cash(second)
        session.refresh_from_db()
        self.table.refresh_from_db()
        self.assertEqual(session.status, DineInSessionStatus.CLOSED.value)
        self.assertEqual(self.table.table_state, TableState.EMPTY.value)


class CashCustodyTests(QAWorkflowBase):
    """QA-05: a repeated customer cash request must not erase the waiter's receipt."""

    def test_repeat_cash_request_after_waiter_received_keeps_custody(self):
        order_id = self.place_dine_in(self.start_session())
        self.to_served(order_id)
        self.post(self.customer, f"/api/restaurants/orders/{order_id}/cash-request/")
        self.assertEqual(self.post(self.waiter, f"/api/restaurants/orders/{order_id}/cash-receive/").status_code, 200)

        res = self.post(self.customer, f"/api/restaurants/orders/{order_id}/cash-request/")
        self.assertIn(res.status_code, (200, 400))
        payment = PaymentDetails.objects.get(order_id=order_id)
        self.assertEqual(payment.cash_received_by_id, self.waiter_p.id)
        self.assertIsNotNone(payment.cash_received_at)

        # Still on the manager's settlement list, not back on the waiter's.
        self.as_user(self.manager)
        ids = [o["id"] for o in self.client.get("/api/restaurants/orders/manager/cash/").data["results"]]
        self.assertIn(order_id, ids)
        self.as_user(self.waiter)
        ids = [o["id"] for o in self.client.get("/api/restaurants/orders/waiter/cash/").data["results"]]
        self.assertNotIn(order_id, ids)

    def test_double_settle_and_double_receive_are_rejected(self):
        order_id = self.place_dine_in(self.start_session())
        self.to_served(order_id)
        self.pay_cash(order_id)
        self.assertEqual(self.post(self.waiter, f"/api/restaurants/orders/{order_id}/cash-receive/").status_code, 400)
        self.assertEqual(self.post(self.manager, f"/api/restaurants/orders/{order_id}/cash-settle/").status_code, 400)
        self.assertEqual(PaymentDetails.objects.filter(order_id=order_id).count(), 1)


class CrossTenantPaymentTests(QAWorkflowBase):
    """QA-06: staff of another restaurant must not confirm this restaurant's payments."""

    def test_other_restaurant_staff_cannot_confirm_transfer(self):
        order_id = self.place_dine_in(self.start_session())
        for intruder in (self.other_waiter, self.other_manager):
            res = self.post(intruder, f"/api/restaurants/orders/{order_id}/pay/", {"payment_method": "transfer"})
            self.assertEqual(res.status_code, 403, res.data)
        order = Orders.objects.get(id=order_id)
        self.assertEqual(order.payment_status, PaymentStatus.PENDING.value)
        self.assertFalse(PaymentDetails.objects.filter(order_id=order_id).exists())

    def test_other_restaurant_staff_cannot_move_order_through_workflow(self):
        order_id = self.place_dine_in(self.start_session())
        self.assertEqual(self.post(self.other_waiter, f"/api/restaurants/orders/{order_id}/accept/").status_code, 403)
        self.to_served(order_id)
        self.post(self.customer, f"/api/restaurants/orders/{order_id}/cash-request/")
        self.assertEqual(self.post(self.other_waiter, f"/api/restaurants/orders/{order_id}/cash-receive/").status_code, 403)
        self.post(self.waiter, f"/api/restaurants/orders/{order_id}/cash-receive/")
        self.assertEqual(self.post(self.other_manager, f"/api/restaurants/orders/{order_id}/cash-settle/").status_code, 403)

    def test_other_customer_cannot_request_cash_for_someone_elses_order(self):
        order_id = self.place_dine_in(self.start_session())
        self.assertEqual(self.post(self.customer2, f"/api/restaurants/orders/{order_id}/cash-request/").status_code, 403)


class CheckoutValidationTests(QAWorkflowBase):
    """QA-07 / QA-08: checkout input validation for every order type."""

    def checkout(self, body):
        self.as_user(self.customer)
        return self.client.post("/api/restaurants/orders/checkout-order/", body, format="json")

    def test_delivery_order_cannot_mix_restaurants(self):
        res = self.checkout({
            "order_type": "DELIVERY",
            "items": [{"menu_item": self.burger.id, "quantity": 1}, {"menu_item": self.other_item.id, "quantity": 1}],
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Orders.objects.count(), 0)

    def test_delivery_order_rejects_unavailable_item(self):
        res = self.checkout({"order_type": "DELIVERY", "items": [{"menu_item": self.sold_out.id, "quantity": 1}]})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Orders.objects.count(), 0)

    def test_invalid_quantity_is_a_400_not_a_500(self):
        for qty in ("abc", None, -3, 0):
            res = self.checkout({
                "order_type": "DELIVERY",
                "items": [{"menu_item": self.burger.id, "quantity": qty}],
            })
            self.assertEqual(res.status_code, 400, (qty, res.status_code))
        self.assertEqual(Orders.objects.count(), 0)

    def test_dine_in_total_is_exact_decimal(self):
        token = self.start_session()
        order_id = self.place_dine_in(token, [
            {"menu_item": self.burger.id, "quantity": 2},
            {"menu_item": self.tea.id, "quantity": 3},
        ])
        self.assertEqual(Orders.objects.get(id=order_id).total_price, Decimal("1141.50"))

    def test_unknown_menu_item_creates_no_order(self):
        res = self.checkout({"order_type": "DELIVERY", "items": [{"menu_item": 999999, "quantity": 1}]})
        self.assertIn(res.status_code, (400, 404))
        self.assertEqual(Orders.objects.count(), 0)


class LegacyStatusEndpointTenantTests(QAWorkflowBase):
    """QA-09: /api/dashboard/change-order-status/ was open to any logged-in user."""

    def test_customer_and_other_restaurant_staff_cannot_change_status(self):
        order_id = self.place_dine_in(self.start_session())
        for intruder in (self.customer, self.customer2, self.other_waiter, self.other_manager):
            res = self.post(intruder, f"/api/dashboard/change-order-status/{order_id}/", {"order_status": OrderStatus.SERVED})
            self.assertEqual(res.status_code, 404, (intruder.email, res.status_code))
        self.assertEqual(Orders.objects.get(id=order_id).order_status, OrderStatus.TO_PREPARE)

    def test_own_restaurant_staff_can_still_use_it(self):
        order_id = self.place_dine_in(self.start_session())
        res = self.post(self.manager, f"/api/dashboard/change-order-status/{order_id}/", {"order_status": OrderStatus.PREPARING})
        self.assertEqual(res.status_code, 200, res.data)


class ProfileDirectoryPrivacyTests(QAWorkflowBase):
    """QA-10: the profile directory exposed every user's email/phone, even anonymously."""

    url = "/api/user-profile/user-profile/"

    def test_anonymous_cannot_list_profiles(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_regular_user_only_sees_own_profile(self):
        self.as_user(self.customer)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        emails = [p["email"] for p in res.data["results"]]
        self.assertEqual(emails, [self.customer.email])
        res = self.client.get(f"{self.url}{self.manager.username}/")
        self.assertEqual(res.status_code, 404)

    def test_super_admin_still_sees_everyone(self):
        admin, _ = make_user("admin@qa.qa", "super_admin")
        self.as_user(admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertGreater(res.data["count"], 1)


class LegacyReviewEndpointTests(QAWorkflowBase):
    """QA-11: /api/dashboard/add-customer-review/ let anyone review any order as anyone."""

    url = "/api/dashboard/add-customer-review/"

    def test_cannot_review_someone_elses_order(self):
        order_id = self.place_dine_in(self.start_session())
        res = self.post(self.customer2, self.url, {
            "order": order_id, "user": self.customer_p.id, "waiter": self.waiter_p.id, "rate": 1,
        })
        self.assertEqual(res.status_code, 403)

    def test_owner_review_is_attributed_to_owner_and_serving_waiter(self):
        order_id = self.place_dine_in(self.start_session())
        self.to_served(order_id)
        res = self.post(self.customer, self.url, {
            "order": order_id, "user": self.customer2_p.id, "waiter": self.chef_p.id, "rate": 5,
        })
        self.assertEqual(res.status_code, 201, res.data)
        from apps.restaurants.models import Review
        review = Review.objects.get(order_id=order_id)
        self.assertEqual(review.user_id, self.customer_p.id)
        self.assertEqual(review.waiter_id, self.waiter_p.id)


class FinancialReconciliationTests(QAWorkflowBase):
    """Phase 3: reports reconcile with a controlled set of orders."""

    def test_reports_count_each_settled_sale_once(self):
        token = self.start_session()
        paid_a = self.place_dine_in(token, [
            {"menu_item": self.burger.id, "quantity": 2},
            {"menu_item": self.tea.id, "quantity": 3},
        ])  # 1141.50
        paid_b = self.place_dine_in(token, [{"menu_item": self.tea.id, "quantity": 1}])  # 80.50
        unpaid = self.place_dine_in(token, [{"menu_item": self.burger.id, "quantity": 1}])  # 450.00
        for order_id in (paid_a, paid_b):
            self.to_served(order_id)
            self.pay_cash(order_id)
        self.to_served(unpaid)
        self.post(self.customer, f"/api/restaurants/orders/{unpaid}/cash-request/")
        self.post(self.waiter, f"/api/restaurants/orders/{unpaid}/cash-receive/")  # not settled

        self.as_user(self.manager)
        overview = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(overview.status_code, 200, overview.data)
        self.assertEqual(Decimal(str(overview.data["revenue"]["gross_sales"])), Decimal("1222.00"))
        self.assertEqual(overview.data["revenue"]["orders_count"], 2)

        dashboard = self.client.get("/api/restaurants/manager/dashboard/")
        self.assertEqual(Decimal(str(dashboard.data["total_revenue"])), Decimal("1222.00"))

        sales = self.client.get("/api/manager/financial/reports/?type=sales&period=today")
        self.assertEqual(sales.status_code, 200, sales.data)
        rows = sales.data.get("orders") or sales.data.get("data", {}).get("orders")
        self.assertEqual(sorted(r["id"] for r in rows), sorted([paid_a, paid_b]))

        # The other restaurant sees none of it.
        self.as_user(self.other_manager)
        other = self.client.get("/api/manager/financial/overview/?period=today")
        self.assertEqual(Decimal(str(other.data["revenue"]["gross_sales"])), Decimal("0"))

    def test_malformed_dates_are_rejected_not_500(self):
        self.as_user(self.manager)
        res = self.client.get("/api/manager/financial/overview/?start_date=not-a-date&end_date=2026-01-01")
        self.assertEqual(res.status_code, 400)
        res = self.client.get("/api/manager/financial/overview/?start_date=2026-02-01&end_date=2026-01-01")
        self.assertEqual(res.status_code, 400)
