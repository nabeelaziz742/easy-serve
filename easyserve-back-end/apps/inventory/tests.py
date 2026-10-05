from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone

from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Restaurant
from apps.inventory.models import (
    InventoryCategory,
    UnitOfMeasure,
    InventoryItem,
    StockMovementLog,
    StockWastage,
)
from apps.inventory.constants import (
    StockMovementType,
    StockAdjustmentReason,
    WastageReason,
)
from apps.inventory.services import StockService, WastageService


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


class InventoryCoreTestCase(TestCase):
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

        # Standard Units
        self.uom_kg = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Kilogram",
            short_code="kg",
            conversion_factor=Decimal("1.0000")
        )
        self.uom_g = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Gram",
            short_code="g",
            conversion_factor=Decimal("0.0010")
        )
        self.uom_liters = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Liter",
            short_code="L",
            conversion_factor=Decimal("1.0000")
        )

        # Categories
        self.cat_produce = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Fresh Produce",
            description="Vegetables and fruits"
        )
        self.cat_dairy = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Dairy",
            description="Milk, cheese, cream"
        )

        # Items for Restaurant A
        self.item_tomatoes = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_produce,
            name="Tomatoes",
            uom=self.uom_kg,
            current_stock=Decimal("25.500"),
            min_reorder_level=Decimal("10.000"),
            cost_per_unit=Decimal("2.50")
        )

        self.item_milk = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_dairy,
            name="Whole Milk",
            uom=self.uom_liters,
            current_stock=Decimal("4.000"),
            min_reorder_level=Decimal("10.000"),
            cost_per_unit=Decimal("1.80")
        )

        self.item_butter = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_dairy,
            name="Unsalted Butter",
            uom=self.uom_kg,
            current_stock=Decimal("0.000"),
            min_reorder_level=Decimal("5.000"),
            cost_per_unit=Decimal("4.50")
        )

    # -------------------------------------------------------------
    # 1. Model & Calculations Tests
    # -------------------------------------------------------------
    def test_stock_calculations_and_status(self):
        # Tomatoes: 25.5 kg * $2.50 = $63.75 -> In Stock
        self.assertEqual(self.item_tomatoes.stock_value, Decimal("63.75"))
        self.assertFalse(self.item_tomatoes.is_low_stock)
        self.assertFalse(self.item_tomatoes.is_out_of_stock)
        self.assertEqual(self.item_tomatoes.stock_status, "in_stock")

        # Milk: 4.0 L * $1.80 = $7.20 -> Low Stock (<= 10.000 and > 0)
        self.assertEqual(self.item_milk.stock_value, Decimal("7.20"))
        self.assertTrue(self.item_milk.is_low_stock)
        self.assertFalse(self.item_milk.is_out_of_stock)
        self.assertEqual(self.item_milk.stock_status, "low_stock")

        # Butter: 0.0 kg -> Out of Stock
        self.assertEqual(self.item_butter.stock_value, Decimal("0.00"))
        self.assertFalse(self.item_butter.is_low_stock)
        self.assertTrue(self.item_butter.is_out_of_stock)
        self.assertEqual(self.item_butter.stock_status, "out_of_stock")

    def test_sku_auto_generation(self):
        item = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_produce,
            name="Potatoes",
            uom=self.uom_kg,
            current_stock=Decimal("50.000"),
            cost_per_unit=Decimal("1.20")
        )
        self.assertTrue(item.sku.startswith(f"INV-{self.restaurant_a.id}-"))

    # -------------------------------------------------------------
    # 2. Service & Ledger Audit Tests
    # -------------------------------------------------------------
    def test_opening_stock_creates_movement_log(self):
        item_data = {
            "restaurant": self.restaurant_a,
            "category": self.cat_produce,
            "name": "Organic Carrots",
            "uom": self.uom_kg,
            "current_stock": Decimal("15.000"),
            "min_reorder_level": Decimal("5.000"),
            "cost_per_unit": Decimal("2.00")
        }
        item = StockService.create_item_with_opening_stock(item_data, self.manager_a_profile)

        self.assertEqual(item.current_stock, Decimal("15.000"))
        logs = StockMovementLog.objects.filter(inventory_item=item)
        self.assertEqual(logs.count(), 1)

        log = logs.first()
        self.assertEqual(log.movement_type, StockMovementType.ADJUSTMENT.value)
        self.assertEqual(log.quantity_delta, Decimal("15.000"))
        self.assertEqual(log.balance_after, Decimal("15.000"))
        self.assertEqual(log.total_value, Decimal("30.00"))
        self.assertEqual(log.reference_note, "Opening Stock Initial Count")
        self.assertEqual(log.logged_by, self.manager_a_profile)

    def test_stock_adjustment_creates_immutable_log(self):
        # Adjust Tomatoes from 25.500 to 30.000 (delta +4.500)
        item, log = StockService.adjust_stock(
            item_id=self.item_tomatoes.id,
            restaurant=self.restaurant_a,
            new_quantity=Decimal("30.000"),
            reason_text="Physical Audit Reconciliation",
            user_profile=self.manager_a_profile,
            notes="Periodic check"
        )
        self.assertEqual(item.current_stock, Decimal("30.000"))
        self.assertEqual(log.movement_type, StockMovementType.ADJUSTMENT.value)
        self.assertEqual(log.quantity_delta, Decimal("4.500"))
        self.assertEqual(log.balance_after, Decimal("30.000"))
        self.assertEqual(log.unit_cost, Decimal("2.50"))
        self.assertEqual(log.total_value, Decimal("11.25"))
        self.assertEqual(log.logged_by, self.manager_a_profile)

    # -------------------------------------------------------------
    # 3. API Integration Tests
    # -------------------------------------------------------------
    def test_list_items_and_filters(self):
        self.client.force_authenticate(user=self.manager_a_user)

        # List all
        res = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)

        # Filter low stock
        res_low = self.client.get("/api/manager/inventory/items/?status=low_stock")
        self.assertEqual(res_low.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_low.data), 1)
        self.assertEqual(res_low.data[0]["name"], "Whole Milk")

        # Filter out of stock
        res_out = self.client.get("/api/manager/inventory/items/?status=out_of_stock")
        self.assertEqual(res_out.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_out.data), 1)
        self.assertEqual(res_out.data[0]["name"], "Unsalted Butter")

    def test_create_item_via_api(self):
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "name": "Cheddar Cheese Block",
            "category": self.cat_dairy.id,
            "uom": self.uom_kg.id,
            "current_stock": "8.000",
            "min_reorder_level": "3.000",
            "cost_per_unit": "5.50"
        }
        res = self.client.post("/api/manager/inventory/items/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "Cheddar Cheese Block")
        self.assertEqual(res.data["current_stock"], "8.000")

        # Audit movement created for opening stock
        self.assertTrue(StockMovementLog.objects.filter(inventory_item_id=res.data["id"]).exists())

    def test_summary_api(self):
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get("/api/manager/inventory/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_items"], 3)
        self.assertEqual(res.data["total_stock_value"], "70.95")

    def test_tenant_isolation_enforcement(self):
        # Manager B should NOT see items or categories of Restaurant A
        self.client.force_authenticate(user=self.manager_b_user)

        res = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

        # Manager B cannot adjust Restaurant A item
        adj_data = {
            "inventory_item_id": self.item_tomatoes.id,
            "new_quantity": "10.000",
            "reason": StockAdjustmentReason.PHYSICAL_AUDIT.value
        }
        res_adj = self.client.post("/api/manager/inventory/adjustments/", adj_data, format="json")
        self.assertEqual(res_adj.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------
    # 4. RBAC Tests
    # -------------------------------------------------------------
    def test_super_admin_and_owner_permissions(self):
        # Super Admin
        self.client.force_authenticate(user=self.super_admin_user)
        res = self.client.get(f"/api/manager/inventory/items/?restaurant_id={self.restaurant_a.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)

        # Restaurant Owner
        self.client.force_authenticate(user=self.owner_user)
        res = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)

    def test_chef_read_only_and_waiter_forbidden(self):
        # Chef can read items
        self.client.force_authenticate(user=self.chef_user)
        res_chef_get = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res_chef_get.status_code, status.HTTP_200_OK)

        # Chef cannot create items
        res_chef_post = self.client.post("/api/manager/inventory/items/", {
            "name": "Basil",
            "category": self.cat_produce.id,
            "uom": self.uom_kg.id,
            "current_stock": "1.000",
            "cost_per_unit": "3.00"
        }, format="json")
        self.assertEqual(res_chef_post.status_code, status.HTTP_403_FORBIDDEN)

        # Chef cannot adjust stock
        res_chef_adj = self.client.post("/api/manager/inventory/adjustments/", {
            "inventory_item_id": self.item_tomatoes.id,
            "new_quantity": "50.000"
        }, format="json")
        self.assertEqual(res_chef_adj.status_code, status.HTTP_403_FORBIDDEN)

        # Waiter cannot access inventory at all
        self.client.force_authenticate(user=self.waiter_user)
        res_waiter = self.client.get("/api/manager/inventory/items/")
        self.assertEqual(res_waiter.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------
    # 5. Phase 4 Wastage Tests
    # -------------------------------------------------------------
    def test_record_wastage_success(self):
        """Valid wastage properly deducts inventory, creates StockWastage, and writes WASTAGE movement log."""
        self.client.force_authenticate(user=self.manager_a_user)
        initial_stock = self.item_tomatoes.current_stock  # 25.500 kg @ $2.50/kg

        payload = {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity": "2.500",
            "reason": WastageReason.EXPIRED.value,
            "notes": "Lot #9402 expired over weekend"
        }
        res = self.client.post("/api/manager/inventory/wastage/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.item_tomatoes.refresh_from_db()
        self.assertEqual(self.item_tomatoes.current_stock, Decimal("23.000"))

        # Verify StockWastage record
        wastage_id = res.data["wastage"]["id"]
        wastage = StockWastage.objects.get(id=wastage_id)
        self.assertEqual(wastage.restaurant, self.restaurant_a)
        self.assertEqual(wastage.inventory_item, self.item_tomatoes)
        self.assertEqual(wastage.quantity, Decimal("2.500"))
        self.assertEqual(wastage.reason, WastageReason.EXPIRED.value)
        self.assertEqual(wastage.unit_cost, Decimal("2.50"))
        self.assertEqual(wastage.total_cost, Decimal("6.25"))  # 2.5 * 2.50
        self.assertEqual(wastage.created_by, self.manager_a_profile)

        # Verify StockMovementLog
        movement = StockMovementLog.objects.filter(wastage=wastage).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.movement_type, StockMovementType.WASTAGE.value)
        self.assertEqual(movement.quantity_delta, Decimal("-2.500"))
        self.assertEqual(movement.balance_after, Decimal("23.000"))
        self.assertEqual(movement.unit_cost, Decimal("2.50"))
        self.assertEqual(movement.total_value, Decimal("6.25"))
        self.assertEqual(movement.logged_by, self.manager_a_profile)
        self.assertIn("WASTAGE (Expired Stock)", movement.reference_note)

    def test_record_wastage_zero_or_negative_quantity(self):
        """Wastage with zero or negative quantity is rejected with 400 Bad Request."""
        self.client.force_authenticate(user=self.manager_a_user)
        for bad_qty in ["0.000", "-1.500"]:
            res = self.client.post("/api/manager/inventory/wastage/", {
                "inventory_item_id": self.item_tomatoes.id,
                "quantity": bad_qty,
                "reason": WastageReason.SPOILED.value
            }, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_record_wastage_insufficient_stock(self):
        """Wastage exceeding current on-hand stock is rejected without partial deduction."""
        self.client.force_authenticate(user=self.manager_a_user)
        # Milk current stock is 4.000 L
        res = self.client.post("/api/manager/inventory/wastage/", {
            "inventory_item_id": self.item_milk.id,
            "quantity": "5.000",
            "reason": WastageReason.SPOILED.value
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", str(res.data))

        self.item_milk.refresh_from_db()
        self.assertEqual(self.item_milk.current_stock, Decimal("4.000"))  # Unchanged

    def test_record_wastage_uom_conversion(self):
        """Wastage recorded in grams for an item stored in kg is converted accurately."""
        self.client.force_authenticate(user=self.manager_a_user)
        # Tomatoes stored in kg (25.500 kg). Record 500 g wastage.
        res = self.client.post("/api/manager/inventory/wastage/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity": "500.000",
            "uom_id": self.uom_g.id,
            "reason": WastageReason.PREPARATION_LOSS.value
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.item_tomatoes.refresh_from_db()
        # 25.500 - 0.500 = 25.000 kg
        self.assertEqual(self.item_tomatoes.current_stock, Decimal("25.000"))

    def test_wastage_tenant_isolation(self):
        """Restaurant B manager cannot view or record wastage for Restaurant A items."""
        self.client.force_authenticate(user=self.manager_b_user)

        # Attempt to record wastage on Restaurant A's item
        res = self.client.post("/api/manager/inventory/wastage/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity": "1.000",
            "reason": WastageReason.DAMAGED.value
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to list wastage for Restaurant B -> empty
        res_list = self.client.get("/api/manager/inventory/wastage/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 0)

    def test_wastage_rbac_chef_and_waiter_forbidden(self):
        """Chefs and Waiters cannot record wastage."""
        # Chef
        self.client.force_authenticate(user=self.chef_user)
        res_chef = self.client.post("/api/manager/inventory/wastage/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity": "1.000",
            "reason": WastageReason.EXPIRED.value
        }, format="json")
        self.assertEqual(res_chef.status_code, status.HTTP_403_FORBIDDEN)

        # Waiter
        self.client.force_authenticate(user=self.waiter_user)
        res_waiter = self.client.post("/api/manager/inventory/wastage/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity": "1.000",
            "reason": WastageReason.EXPIRED.value
        }, format="json")
        self.assertEqual(res_waiter.status_code, status.HTTP_403_FORBIDDEN)

    def test_wastage_summary_metrics(self):
        """Wastage summary returns real DB aggregated values."""
        self.client.force_authenticate(user=self.manager_a_user)
        # Create 2 wastage events
        WastageService.record_wastage(
            restaurant=self.restaurant_a,
            inventory_item_id=self.item_tomatoes.id,
            quantity=Decimal("2.000"),
            reason=WastageReason.EXPIRED.value,
            user_profile=self.manager_a_profile
        )  # 2.0 * 2.50 = 5.00
        WastageService.record_wastage(
            restaurant=self.restaurant_a,
            inventory_item_id=self.item_milk.id,
            quantity=Decimal("1.000"),
            reason=WastageReason.SPOILED.value,
            user_profile=self.manager_a_profile
        )  # 1.0 * 1.80 = 1.80

        res = self.client.get("/api/manager/inventory/wastage/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_records"], 2)
        self.assertEqual(res.data["today_cost"], "6.80")
        self.assertEqual(len(res.data["top_wasted_items"]), 2)

    # -------------------------------------------------------------
    # 6. Advanced Stock Adjustments & Physical Stock Count
    # -------------------------------------------------------------
    def test_stock_adjustment_with_quantity_delta(self):
        """Stock adjustment supporting relative quantity_delta (+ and -)."""
        self.client.force_authenticate(user=self.manager_a_user)
        # Initial stock: 25.500 kg. Add +5.000 kg via CORRECTION_IN
        res_plus = self.client.post("/api/manager/inventory/adjustments/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity_delta": "5.000",
            "reason": StockAdjustmentReason.CORRECTION_IN.value,
            "notes": "Found extra crate in cold storage"
        }, format="json")
        self.assertEqual(res_plus.status_code, status.HTTP_200_OK)

        self.item_tomatoes.refresh_from_db()
        self.assertEqual(self.item_tomatoes.current_stock, Decimal("30.500"))

        # Deduct -2.500 kg via CORRECTION_OUT
        res_minus = self.client.post("/api/manager/inventory/adjustments/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity_delta": "-2.500",
            "reason": StockAdjustmentReason.CORRECTION_OUT.value,
            "notes": "Correction adjustment"
        }, format="json")
        self.assertEqual(res_minus.status_code, status.HTTP_200_OK)

        self.item_tomatoes.refresh_from_db()
        self.assertEqual(self.item_tomatoes.current_stock, Decimal("28.000"))

    def test_physical_stock_count_multi_item_reconciliation(self):
        """Batch physical stock count updates stock, calculates variances and variance values."""
        self.client.force_authenticate(user=self.manager_a_user)
        # Tomatoes: System 25.500 kg -> Physical 23.000 kg (Variance -2.500 kg, Value $6.25)
        # Milk: System 4.000 L -> Physical 6.000 L (Variance +2.000 L, Value $3.60)
        payload = {
            "items": [
                {
                    "inventory_item_id": self.item_tomatoes.id,
                    "physical_count": "23.000",
                    "notes": "End of week count"
                },
                {
                    "inventory_item_id": self.item_milk.id,
                    "physical_count": "6.000",
                    "notes": "Extra carton counted"
                }
            ],
            "audit_notes": "Weekly physical audit"
        }
        res = self.client.post("/api/manager/inventory/stock-count/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["adjusted_items_count"], 2)

        self.item_tomatoes.refresh_from_db()
        self.assertEqual(self.item_tomatoes.current_stock, Decimal("23.000"))

        self.item_milk.refresh_from_db()
        self.assertEqual(self.item_milk.current_stock, Decimal("6.000"))

        # Verify ledger entries
        logs = StockMovementLog.objects.filter(inventory_item__in=[self.item_tomatoes, self.item_milk]).order_by('-created_at')[:2]
        self.assertEqual(logs.count(), 2)

    def test_cost_integrity_after_wastage_and_adjustment(self):
        """Wastage and adjustments deduct/add quantities but maintain the WAC unit cost basis."""
        self.client.force_authenticate(user=self.manager_a_user)
        initial_wac = self.item_tomatoes.cost_per_unit  # $2.50

        # Perform wastage
        self.client.post("/api/manager/inventory/wastage/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity": "2.000",
            "reason": WastageReason.DAMAGED.value
        }, format="json")

        self.item_tomatoes.refresh_from_db()
        self.assertEqual(self.item_tomatoes.cost_per_unit, initial_wac)

        # Perform adjustment
        self.client.post("/api/manager/inventory/adjustments/", {
            "inventory_item_id": self.item_tomatoes.id,
            "quantity_delta": "3.000",
            "reason": StockAdjustmentReason.CORRECTION_IN.value
        }, format="json")

        self.item_tomatoes.refresh_from_db()
        self.assertEqual(self.item_tomatoes.cost_per_unit, initial_wac)
