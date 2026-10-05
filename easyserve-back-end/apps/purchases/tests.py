from decimal import Decimal
from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryCategory, UnitOfMeasure, InventoryItem, StockMovementLog
from apps.inventory.constants import StockMovementType
from apps.purchases.models import Supplier, PurchaseOrder, PurchaseOrderItem
from apps.purchases.constants import PurchaseStatus
from apps.purchases.services import PurchaseService


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


class PurchasesTestCase(TestCase):
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

        # UOM & Category
        self.uom_kg = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Kilogram",
            short_code="kg"
        )
        self.cat_meat = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Meat & Poultry"
        )

        # Inventory Items for Restaurant A
        # Chicken: 100 units @ Rs.100.00
        self.item_chicken = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_meat,
            name="Chicken Breast",
            uom=self.uom_kg,
            current_stock=Decimal("100.000"),
            min_reorder_level=Decimal("20.000"),
            cost_per_unit=Decimal("100.00")
        )
        # Cheese: 0 units @ Rs.0.00
        self.item_cheese = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.cat_meat,
            name="Mozzarella Cheese",
            uom=self.uom_kg,
            current_stock=Decimal("0.000"),
            min_reorder_level=Decimal("10.000"),
            cost_per_unit=Decimal("0.00")
        )

        # Supplier for Restaurant A
        self.supplier_a = Supplier.objects.create(
            restaurant=self.restaurant_a,
            name="Prime Poultry Farms",
            contact_person="Ahmed Khan",
            phone="+923001234567",
            email="ahmed@primepoultry.com"
        )

        # Supplier for Restaurant B
        self.supplier_b = Supplier.objects.create(
            restaurant=self.restaurant_b,
            name="Beta Farm Supplies",
            contact_person="Beta Contact"
        )

    # 1. Supplier creation
    def test_supplier_creation(self):
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "name": "Metro Cash & Carry",
            "contact_person": "Ali Raza",
            "phone": "+923219876543",
            "email": "ali@metro.com",
            "address": "Route 5, City Center"
        }
        resp = self.client.post("/api/manager/purchases/suppliers/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["name"], "Metro Cash & Carry")
        self.assertEqual(resp.data["contact_person"], "Ali Raza")
        self.assertTrue(Supplier.objects.filter(restaurant=self.restaurant_a, name="Metro Cash & Carry").exists())

    # 2. Supplier tenant isolation
    def test_supplier_tenant_isolation(self):
        self.client.force_authenticate(user=self.manager_a_user)
        # Manager A should see only Restaurant A suppliers
        resp = self.client.get("/api/manager/purchases/suppliers/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [s["name"] for s in resp.data]
        self.assertIn("Prime Poultry Farms", names)
        self.assertNotIn("Beta Farm Supplies", names)

        # Manager A cannot view supplier B detail
        resp_b = self.client.get(f"/api/manager/purchases/suppliers/{self.supplier_b.id}/")
        self.assertEqual(resp_b.status_code, status.HTTP_404_NOT_FOUND)

    # 3-7. Purchase creation, calculations, subtotal, tax, total
    def test_purchase_creation_and_financial_calculations(self):
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "supplier_id": self.supplier_a.id,
            "purchase_date": str(date.today()),
            "invoice_number": "INV-2026-001",
            "tax_amount": "500.00",
            "notes": "Weekly raw materials",
            "items": [
                {
                    "inventory_item_id": self.item_chicken.id,
                    "quantity": "100.000",
                    "unit_cost": "120.00"  # 100 * 120 = 12000.00
                },
                {
                    "inventory_item_id": self.item_cheese.id,
                    "quantity": "50.000",
                    "unit_cost": "80.00"   # 50 * 80 = 4000.00
                }
            ]
        }
        resp = self.client.post("/api/manager/purchases/orders/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.data

        self.assertEqual(Decimal(str(data["subtotal"])), Decimal("16000.00"))
        self.assertEqual(Decimal(str(data["tax_amount"])), Decimal("500.00"))
        self.assertEqual(Decimal(str(data["total_amount"])), Decimal("16500.00"))
        self.assertEqual(data["status"], PurchaseStatus.DRAFT.value)
        self.assertTrue(data["purchase_number"].startswith("PO-"))

    # 8. Draft purchase does NOT affect inventory
    def test_draft_purchase_does_not_affect_inventory(self):
        self.client.force_authenticate(user=self.manager_a_user)
        initial_stock = self.item_chicken.current_stock
        initial_cost = self.item_chicken.cost_per_unit

        payload = {
            "supplier_id": self.supplier_a.id,
            "purchase_date": str(date.today()),
            "items": [
                {
                    "inventory_item_id": self.item_chicken.id,
                    "quantity": "50.000",
                    "unit_cost": "150.00"
                }
            ]
        }
        resp = self.client.post("/api/manager/purchases/orders/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # Verify inventory unchanged
        self.item_chicken.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, initial_stock)
        self.assertEqual(self.item_chicken.cost_per_unit, initial_cost)
        self.assertEqual(StockMovementLog.objects.filter(inventory_item=self.item_chicken).count(), 0)

    # 9-12. Receiving purchase increases inventory, creates movement, calculates WAC
    def test_receive_purchase_workflow_and_weighted_average_cost(self):
        self.client.force_authenticate(user=self.manager_a_user)

        # Existing Chicken: 100 kg @ Rs.100.00 (Total value = 10,000.00)
        # Purchase: 100 kg @ Rs.120.00 (Total value = 12,000.00)
        # Expected new stock: 200 kg
        # Expected new WAC: (10,000 + 12,000) / 200 = 22,000 / 200 = Rs.110.00
        po = PurchaseService.create_purchase_order(
            restaurant=self.restaurant_a,
            user_profile=self.manager_a_profile,
            validated_data={
                "supplier": self.supplier_a,
                "purchase_date": date.today(),
                "invoice_number": "INV-WAC-TEST",
                "tax_amount": Decimal("0.00")
            },
            items_data=[
                {
                    "inventory_item": self.item_chicken,
                    "quantity": Decimal("100.000"),
                    "unit_cost": Decimal("120.00")
                },
                {
                    "inventory_item": self.item_cheese, # 0 stock @ Rs.0 -> 50 kg @ Rs.90.00 -> new WAC = Rs.90.00
                    "quantity": Decimal("50.000"),
                    "unit_cost": Decimal("90.00")
                }
            ]
        )

        resp = self.client.post(f"/api/manager/purchases/orders/{po.id}/receive/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Verify Chicken
        self.item_chicken.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, Decimal("200.000"))
        self.assertEqual(self.item_chicken.cost_per_unit, Decimal("110.00"))

        # Verify Cheese
        self.item_cheese.refresh_from_db()
        self.assertEqual(self.item_cheese.current_stock, Decimal("50.000"))
        self.assertEqual(self.item_cheese.cost_per_unit, Decimal("90.00"))

        # Verify StockMovementLog
        chicken_movements = StockMovementLog.objects.filter(inventory_item=self.item_chicken)
        self.assertEqual(chicken_movements.count(), 1)
        mov = chicken_movements.first()
        self.assertEqual(mov.movement_type, StockMovementType.PURCHASE_IN.value)
        self.assertEqual(mov.quantity_delta, Decimal("100.000"))
        self.assertEqual(mov.balance_after, Decimal("200.000"))
        self.assertEqual(mov.unit_cost, Decimal("120.00"))
        self.assertIn("INV-WAC-TEST", mov.reference_note)

        # Verify PO status
        po.refresh_from_db()
        self.assertEqual(po.status, PurchaseStatus.RECEIVED.value)
        self.assertEqual(po.received_by, self.manager_a_profile)
        self.assertIsNotNone(po.received_at)

    # 13. Duplicate receive is prevented (Double receiving protection)
    def test_duplicate_receive_is_prevented(self):
        self.client.force_authenticate(user=self.manager_a_user)
        po = PurchaseService.create_purchase_order(
            restaurant=self.restaurant_a,
            user_profile=self.manager_a_profile,
            validated_data={
                "supplier": self.supplier_a,
                "purchase_date": date.today(),
            },
            items_data=[
                {
                    "inventory_item": self.item_chicken,
                    "quantity": Decimal("10.000"),
                    "unit_cost": Decimal("100.00")
                }
            ]
        )

        # First receive -> OK
        resp1 = self.client.post(f"/api/manager/purchases/orders/{po.id}/receive/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second receive -> Rejected with 400 Bad Request
        resp2 = self.client.post(f"/api/manager/purchases/orders/{po.id}/receive/")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify stock only increased by 10 once (100 + 10 = 110)
        self.item_chicken.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, Decimal("110.000"))

    # 14. Transaction rollback on failure
    def test_transaction_rollback_on_receive_failure(self):
        po = PurchaseService.create_purchase_order(
            restaurant=self.restaurant_a,
            user_profile=self.manager_a_profile,
            validated_data={
                "supplier": self.supplier_a,
                "purchase_date": date.today(),
            },
            items_data=[
                {
                    "inventory_item": self.item_chicken,
                    "quantity": Decimal("10.000"),
                    "unit_cost": Decimal("100.00")
                }
            ]
        )

        initial_stock = self.item_chicken.current_stock

        # Simulate invalid state on line item
        line_item = po.items.first()
        line_item.quantity = Decimal("-5.000") # invalid
        line_item.save(update_fields=["quantity"])

        self.client.force_authenticate(user=self.manager_a_user)
        resp = self.client.post(f"/api/manager/purchases/orders/{po.id}/receive/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Stock and movements must be completely untouched
        self.item_chicken.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, initial_stock)
        self.assertEqual(StockMovementLog.objects.filter(inventory_item=self.item_chicken).count(), 0)
        po.refresh_from_db()
        self.assertEqual(po.status, PurchaseStatus.DRAFT.value)

    # 15. Restaurant isolation (Tenant A cannot see/receive Tenant B purchase)
    def test_tenant_isolation_purchase_order(self):
        po_b = PurchaseService.create_purchase_order(
            restaurant=self.restaurant_b,
            user_profile=self.manager_b_profile,
            validated_data={
                "supplier": self.supplier_b,
                "purchase_date": date.today(),
            },
            items_data=[]
        ) if False else None

        # Create PO for B directly
        item_b = InventoryItem.objects.create(
            restaurant=self.restaurant_b,
            category=InventoryCategory.objects.create(restaurant=self.restaurant_b, name="B Cat"),
            name="Item B",
            uom=UnitOfMeasure.objects.create(restaurant=self.restaurant_b, name="Kg", short_code="kg"),
            current_stock=Decimal("10.000"),
            cost_per_unit=Decimal("50.00")
        )
        po_b = PurchaseOrder.objects.create(
            restaurant=self.restaurant_b,
            supplier=self.supplier_b,
            purchase_number="PO-B-000001",
            purchase_date=date.today(),
            status=PurchaseStatus.DRAFT.value
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po_b,
            inventory_item=item_b,
            quantity=Decimal("5.000"),
            unit_cost=Decimal("50.00"),
            total_cost=Decimal("250.00")
        )

        # Manager A attempts to view PO B
        self.client.force_authenticate(user=self.manager_a_user)
        resp = self.client.get(f"/api/manager/purchases/orders/{po_b.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # Manager A attempts to receive PO B
        resp_receive = self.client.post(f"/api/manager/purchases/orders/{po_b.id}/receive/")
        self.assertEqual(resp_receive.status_code, status.HTTP_404_NOT_FOUND)

    # 16-18. RBAC: Manager has access, Chef & Waiter are strictly forbidden
    def test_rbac_chef_and_waiter_restrictions(self):
        # Chef
        self.client.force_authenticate(user=self.chef_user)
        resp_chef = self.client.get("/api/manager/purchases/orders/")
        self.assertEqual(resp_chef.status_code, status.HTTP_403_FORBIDDEN)

        resp_chef_sup = self.client.get("/api/manager/purchases/suppliers/")
        self.assertEqual(resp_chef_sup.status_code, status.HTTP_403_FORBIDDEN)

        # Waiter
        self.client.force_authenticate(user=self.waiter_user)
        resp_waiter = self.client.get("/api/manager/purchases/orders/")
        self.assertEqual(resp_waiter.status_code, status.HTTP_403_FORBIDDEN)

    # 19. Purchase filtering
    def test_purchase_filtering(self):
        self.client.force_authenticate(user=self.manager_a_user)
        po1 = PurchaseOrder.objects.create(
            restaurant=self.restaurant_a,
            supplier=self.supplier_a,
            purchase_number="PO-ALPHA-01",
            invoice_number="INV-UNIQUE-123",
            purchase_date=date(2026, 5, 10),
            status=PurchaseStatus.DRAFT.value,
            total_amount=Decimal("100.00")
        )
        po2 = PurchaseOrder.objects.create(
            restaurant=self.restaurant_a,
            supplier=self.supplier_a,
            purchase_number="PO-ALPHA-02",
            invoice_number="INV-OTHER-456",
            purchase_date=date(2026, 6, 15),
            status=PurchaseStatus.RECEIVED.value,
            total_amount=Decimal("200.00")
        )

        # Search by invoice
        resp = self.client.get("/api/manager/purchases/orders/?search=UNIQUE-123")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["purchase_number"], "PO-ALPHA-01")

        # Filter by status
        resp_status = self.client.get("/api/manager/purchases/orders/?status=received")
        self.assertEqual(resp_status.status_code, status.HTTP_200_OK)
        numbers = [p["purchase_number"] for p in resp_status.data]
        self.assertIn("PO-ALPHA-02", numbers)
        self.assertNotIn("PO-ALPHA-01", numbers)

    # 20. Historical purchase integrity
    def test_historical_purchase_supplier_integrity(self):
        self.client.force_authenticate(user=self.manager_a_user)
        po = PurchaseOrder.objects.create(
            restaurant=self.restaurant_a,
            supplier=self.supplier_a,
            purchase_number="PO-HISTORICAL-01",
            purchase_date=date.today(),
            status=PurchaseStatus.RECEIVED.value,
            total_amount=Decimal("500.00")
        )

        # Attempt to delete supplier with historical purchase orders -> should soft-deactivate
        resp = self.client.delete(f"/api/manager/purchases/suppliers/{self.supplier_a.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

        self.supplier_a.refresh_from_db()
        self.assertFalse(self.supplier_a.is_active)
        self.assertTrue(Supplier.objects.filter(id=self.supplier_a.id).exists())
        self.assertEqual(po.supplier_id, self.supplier_a.id)
