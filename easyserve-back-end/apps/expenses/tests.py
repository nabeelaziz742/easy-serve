from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Restaurant
from apps.expenses.models import ExpenseCategory, Expense
from apps.expenses.constants import ExpensePaymentMethod, ExpenseStatus
from apps.expenses.services import ExpenseService


def create_test_user(email, user_type, restaurant=None, owned_restaurants=None):
    user = User.objects.create_user(email=email, username=email, password="password123", user_type=user_type)
    user.is_active = True
    user.save(update_fields=["is_active"])
    profile = UserProfile.objects.create(
        user=user,
        first_name="Test",
        last_name=user_type,
        restaurant=restaurant,
    )
    if owned_restaurants:
        profile.owned_restaurants.set(owned_restaurants)
    return user, profile


class ExpensesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Restaurants
        self.restaurant_a = Restaurant.objects.create(name="Restaurant Alpha")
        self.restaurant_b = Restaurant.objects.create(name="Restaurant Beta")

        # Users
        self.super_admin_user, self.super_admin_profile = create_test_user(
            "admin@easyserve.com", "super_admin"
        )
        self.owner_user, self.owner_profile = create_test_user(
            "owner@alpha.com", "restaurant_owner", owned_restaurants=[self.restaurant_a]
        )
        self.manager_a_user, self.manager_a_profile = create_test_user(
            "manager@alpha.com", "manager", restaurant=self.restaurant_a
        )
        self.manager_b_user, self.manager_b_profile = create_test_user(
            "manager@beta.com", "manager", restaurant=self.restaurant_b
        )
        self.chef_user, self.chef_profile = create_test_user(
            "chef@alpha.com", "chef", restaurant=self.restaurant_a
        )
        self.waiter_user, self.waiter_profile = create_test_user(
            "waiter@alpha.com", "waiter", restaurant=self.restaurant_a
        )

        # Categories for Restaurant A
        self.cat_utilities = ExpenseCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Utilities",
            description="Electricity, water, gas"
        )
        self.cat_salaries = ExpenseCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Salaries & Wages",
            description="Monthly staff payroll"
        )
        self.cat_maintenance = ExpenseCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Repairs & Maintenance",
            description="Equipment and facility upkeep"
        )

        # Category for Restaurant B
        self.cat_b_rent = ExpenseCategory.objects.create(
            restaurant=self.restaurant_b,
            name="Rent",
            description="Beta restaurant lease"
        )

    # -------------------------------------------------------------
    # 1. Expense Creation Tests
    # -------------------------------------------------------------
    def test_create_valid_expense(self):
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "title": "Commercial Electricity Bill",
            "category": self.cat_utilities.id,
            "amount": "45000.00",
            "expense_date": str(timezone.now().date()),
            "payment_method": ExpensePaymentMethod.BANK_TRANSFER.value,
            "vendor_payee": "K-Electric / WAPDA",
            "reference_number": "BILL-984021",
            "notes": "August billing cycle"
        }
        res = self.client.post("/api/manager/expenses/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Commercial Electricity Bill")
        self.assertEqual(res.data["amount"], "45000.00")
        self.assertEqual(res.data["category_name"], "Utilities")
        self.assertTrue(res.data["expense_number"].startswith("EXP-"))
        self.assertEqual(res.data["status"], ExpenseStatus.ACTIVE.value)

        # Verify DB
        expense = Expense.objects.get(id=res.data["id"])
        self.assertEqual(expense.restaurant, self.restaurant_a)
        self.assertEqual(expense.created_by, self.manager_a_profile)

    def test_reject_zero_and_negative_amount(self):
        self.client.force_authenticate(user=self.manager_a_user)
        for bad_amount in ["0.00", "-500.00"]:
            res = self.client.post("/api/manager/expenses/", {
                "title": "Invalid Amount Expense",
                "category": self.cat_utilities.id,
                "amount": bad_amount,
                "payment_method": ExpensePaymentMethod.CASH.value
            }, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_tenant_category_rejection(self):
        """Manager A cannot use a category belonging to Restaurant B."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.post("/api/manager/expenses/", {
            "title": "Illegal Cross-Tenant Expense",
            "category": self.cat_b_rent.id,  # belongs to restaurant_b
            "amount": "10000.00",
            "payment_method": ExpensePaymentMethod.CASH.value
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------
    # 2. RBAC & Security Tests
    # -------------------------------------------------------------
    def test_super_admin_and_owner_access(self):
        # Super Admin
        self.client.force_authenticate(user=self.super_admin_user)
        res_admin = self.client.get(f"/api/manager/expenses/categories/?restaurant_id={self.restaurant_a.id}")
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_admin.data), 3)

        # Restaurant Owner
        self.client.force_authenticate(user=self.owner_user)
        res_owner = self.client.get("/api/manager/expenses/categories/")
        self.assertEqual(res_owner.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_owner.data), 3)

    def test_chef_and_waiter_strictly_forbidden(self):
        # Chef
        self.client.force_authenticate(user=self.chef_user)
        res_chef = self.client.get("/api/manager/expenses/")
        self.assertEqual(res_chef.status_code, status.HTTP_403_FORBIDDEN)

        res_chef_post = self.client.post("/api/manager/expenses/", {
            "title": "Kitchen Knife Set",
            "category": self.cat_maintenance.id,
            "amount": "5000.00"
        }, format="json")
        self.assertEqual(res_chef_post.status_code, status.HTTP_403_FORBIDDEN)

        # Waiter
        self.client.force_authenticate(user=self.waiter_user)
        res_waiter = self.client.get("/api/manager/expenses/")
        self.assertEqual(res_waiter.status_code, status.HTTP_403_FORBIDDEN)

    def test_tenant_isolation_listing_and_mutation(self):
        # Create an expense under Restaurant A
        exp_a = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_utilities,
            title="Alpha Generator Fuel",
            amount=Decimal("12000.00"),
            expense_date=timezone.now().date(),
            payment_method=ExpensePaymentMethod.CASH.value,
            created_by=self.manager_a_profile
        )

        # Manager B lists expenses -> should see 0
        self.client.force_authenticate(user=self.manager_b_user)
        res_list = self.client.get("/api/manager/expenses/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.data["count"], 0)

        # Manager B attempts to retrieve Restaurant A's expense -> 404
        res_get = self.client.get(f"/api/manager/expenses/{exp_a.id}/")
        self.assertEqual(res_get.status_code, status.HTTP_404_NOT_FOUND)

        # Manager B attempts to void Restaurant A's expense -> 404
        res_void = self.client.post(f"/api/manager/expenses/{exp_a.id}/void/", {
            "void_reason": "Malicious void attempt"
        }, format="json")
        self.assertEqual(res_void.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------------------------------------------
    # 3. Expense Update & Void Tests
    # -------------------------------------------------------------
    def test_update_active_expense(self):
        self.client.force_authenticate(user=self.manager_a_user)
        exp = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_maintenance,
            title="Deep Fryer Heating Element Repair",
            amount=Decimal("8500.00"),
            expense_date=timezone.now().date(),
            payment_method=ExpensePaymentMethod.CASH.value,
            created_by=self.manager_a_profile
        )

        res = self.client.patch(f"/api/manager/expenses/{exp.id}/", {
            "amount": "9200.00",
            "notes": "Added replacement gasket fee"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        exp.refresh_from_db()
        self.assertEqual(exp.amount, Decimal("9200.00"))
        self.assertEqual(exp.notes, "Added replacement gasket fee")

    def test_void_expense_workflow(self):
        self.client.force_authenticate(user=self.manager_a_user)
        exp = Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_utilities,
            title="Accidental Duplicate Water Bill",
            amount=Decimal("6000.00"),
            expense_date=timezone.now().date(),
            payment_method=ExpensePaymentMethod.CASH.value,
            created_by=self.manager_a_profile
        )

        # Attempt to void without reason -> 400
        res_bad = self.client.post(f"/api/manager/expenses/{exp.id}/void/", {
            "void_reason": ""
        }, format="json")
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Void with valid reason
        res = self.client.post(f"/api/manager/expenses/{exp.id}/void/", {
            "void_reason": "Duplicate entry entered by cashier"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        exp.refresh_from_db()
        self.assertEqual(exp.status, ExpenseStatus.VOIDED.value)
        self.assertEqual(exp.void_reason, "Duplicate entry entered by cashier")
        self.assertEqual(exp.voided_by, self.manager_a_profile)
        self.assertIsNotNone(exp.voided_at)

        # Cannot edit voided expense
        res_edit = self.client.patch(f"/api/manager/expenses/{exp.id}/", {
            "amount": "7000.00"
        }, format="json")
        self.assertEqual(res_edit.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------
    # 4. Expense Summary & Breakdown Tests
    # -------------------------------------------------------------
    def test_summary_and_breakdown_aggregations(self):
        self.client.force_authenticate(user=self.manager_a_user)
        today = timezone.now().date()

        # Create active expenses
        Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_utilities,
            title="Gas Cylinder Refill",
            amount=Decimal("15000.00"),
            expense_date=today,
            payment_method=ExpensePaymentMethod.CASH.value,
            created_by=self.manager_a_profile
        )
        Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_salaries,
            title="Kitchen Helper Weekly Wage",
            amount=Decimal("25000.00"),
            expense_date=today,
            payment_method=ExpensePaymentMethod.BANK_TRANSFER.value,
            created_by=self.manager_a_profile
        )

        # Create voided expense (must NOT be counted in totals)
        Expense.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_maintenance,
            title="Cancelled Repair",
            amount=Decimal("50000.00"),
            expense_date=today,
            payment_method=ExpensePaymentMethod.CARD.value,
            status=ExpenseStatus.VOIDED.value,
            void_reason="Cancelled",
            created_by=self.manager_a_profile
        )

        # Summary API
        res_sum = self.client.get("/api/manager/expenses/summary/")
        self.assertEqual(res_sum.status_code, status.HTTP_200_OK)
        # Total active = 15000 + 25000 = 40000 (excluding 50000 voided)
        self.assertEqual(res_sum.data["today_total"], "40000.00")
        self.assertEqual(res_sum.data["this_month_total"], "40000.00")
        self.assertEqual(res_sum.data["active_count"], 2)
        self.assertEqual(res_sum.data["voided_count"], 1)

        # Breakdown API
        res_brk = self.client.get("/api/manager/expenses/breakdown/")
        self.assertEqual(res_brk.status_code, status.HTTP_200_OK)
        self.assertEqual(res_brk.data["total_amount"], "40000.00")
        self.assertEqual(len(res_brk.data["categories"]), 2)
        self.assertEqual(len(res_brk.data["payment_methods"]), 2)
