from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.exceptions import ValidationError

from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Restaurant, Menu, MenuItem, Orders, OrderItem, Category
from apps.restaurants.constants import OrderStatus, OrderType, PaymentStatus
from apps.inventory.models import InventoryCategory, UnitOfMeasure, InventoryItem, StockMovementLog
from apps.inventory.constants import StockMovementType
from apps.recipes.models import Recipe, RecipeItem
from apps.recipes.services import RecipeService, RecipeConsumptionService, UOMConverter
from apps.dashboard.services import OrderService


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


class RecipesAndConsumptionTestCase(TestCase):
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
        self.customer_user, self.customer_profile = create_test_user(
            "customer@example.com", "customer"
        )

        # UOMs
        self.uom_kg = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Kilogram",
            short_code="kg"
        )
        self.uom_g = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Gram",
            short_code="g"
        )
        self.uom_pcs = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Piece",
            short_code="pcs"
        )
        self.uom_l = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Liter",
            short_code="L"
        )
        self.uom_ml = UnitOfMeasure.objects.create(
            restaurant=self.restaurant_a,
            name="Milliliter",
            short_code="ml"
        )

        # Inventory Categories
        self.inv_cat = InventoryCategory.objects.create(
            restaurant=self.restaurant_a,
            name="Raw Ingredients"
        )

        # Inventory Items for Restaurant A
        # Chicken: 10 kg @ Rs.800.00 / kg
        self.item_chicken = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.inv_cat,
            name="Raw Chicken Breast",
            uom=self.uom_kg,
            current_stock=Decimal("10.000"),
            cost_per_unit=Decimal("800.00")
        )
        # Burger Bun: 50 pcs @ Rs.30.00 / pcs
        self.item_bun = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.inv_cat,
            name="Burger Bun",
            uom=self.uom_pcs,
            current_stock=Decimal("50.000"),
            cost_per_unit=Decimal("30.00")
        )
        # Cheese Slice: 100 pcs @ Rs.25.00 / pcs
        self.item_cheese = InventoryItem.objects.create(
            restaurant=self.restaurant_a,
            category=self.inv_cat,
            name="Cheddar Cheese Slice",
            uom=self.uom_pcs,
            current_stock=Decimal("100.000"),
            cost_per_unit=Decimal("25.00")
        )

        # Menus and MenuItems for Restaurant A
        self.menu_a = Menu.objects.create(
            restaurant=self.restaurant_a,
            name="Main Dining Menu"
        )
        self.cat_food = Category.objects.create(
            restaurant=self.restaurant_a,
            name="Burgers"
        )
        self.menu_burger = MenuItem.objects.create(
            menu=self.menu_a,
            category=self.cat_food,
            name="Classic Chicken Burger",
            price=Decimal("650.00"),
            is_available=True
        )
        self.menu_drink = MenuItem.objects.create(
            menu=self.menu_a,
            category=self.cat_food,
            name="Soft Drink Can",
            price=Decimal("150.00"),
            is_available=True
        )

    # 1-5. Recipe creation, ingredients, permissions, and cost calculation
    def test_recipe_creation_and_cost_calculation(self):
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "menu_item_id": self.menu_burger.id,
            "yield_servings": "1.00",
            "instructions": "Grill chicken for 6 mins, toast bun, assemble with cheese slice.",
            "items": [
                {
                    "inventory_item_id": self.item_chicken.id,
                    "quantity_required": "150.0000", # 150g -> 0.15kg * 800 = Rs.120.00
                    "uom_id": self.uom_g.id
                },
                {
                    "inventory_item_id": self.item_bun.id,
                    "quantity_required": "1.0000",   # 1 pcs * 30 = Rs.30.00
                    "uom_id": self.uom_pcs.id
                },
                {
                    "inventory_item_id": self.item_cheese.id,
                    "quantity_required": "1.0000",   # 1 pcs * 25 = Rs.25.00
                    "uom_id": self.uom_pcs.id
                }
            ]
        }
        resp = self.client.post("/api/manager/recipes/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.data

        # Total Cost = 120 + 30 + 25 = Rs.175.00
        self.assertEqual(Decimal(str(data["total_cost"])), Decimal("175.00"))
        self.assertEqual(Decimal(str(data["cost_per_serving"])), Decimal("175.00"))
        # Food Cost % = 175 / 650 * 100 = 26.9%
        self.assertEqual(Decimal(str(data["food_cost_percentage"])), Decimal("26.9"))

    # 6-8. UOM compatibility, conversion, and rejection
    def test_uom_conversion_and_incompatible_rejection(self):
        # 150 grams to kilograms -> 0.150 kg
        converted = UOMConverter.convert(Decimal("150.0"), self.uom_g, self.uom_kg)
        self.assertEqual(converted, Decimal("0.15"))

        # 0.5 Liters to milliliters -> 500 ml
        converted_vol = UOMConverter.convert(Decimal("0.5"), self.uom_l, self.uom_ml)
        self.assertEqual(converted_vol, Decimal("500.0"))

        # Incompatible: kg to pcs -> must raise ValidationError
        with self.assertRaises(ValidationError):
            UOMConverter.convert(Decimal("1.0"), self.uom_kg, self.uom_pcs)

    # 4. RBAC: Chef read-only, Waiter forbidden
    def test_recipe_rbac_restrictions(self):
        # Create a recipe first
        recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger,
            yield_servings=Decimal("1.00")
        )

        # Chef can read
        self.client.force_authenticate(user=self.chef_user)
        resp_chef_get = self.client.get("/api/manager/recipes/")
        self.assertEqual(resp_chef_get.status_code, status.HTTP_200_OK)

        # Chef cannot create/modify
        resp_chef_post = self.client.post("/api/manager/recipes/", {"menu_item_id": self.menu_drink.id}, format="json")
        self.assertEqual(resp_chef_post.status_code, status.HTTP_403_FORBIDDEN)

        # Waiter is forbidden completely
        self.client.force_authenticate(user=self.waiter_user)
        resp_waiter = self.client.get("/api/manager/recipes/")
        self.assertEqual(resp_waiter.status_code, status.HTTP_403_FORBIDDEN)

    # 9-15. Order PREPARED triggers consumption, quantity multiplier, movements, and COGS
    def test_order_prepared_triggers_automatic_consumption(self):
        # Setup Recipe for Burger
        recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger,
            yield_servings=Decimal("1.00")
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_chicken,
            quantity_required=Decimal("150.0000"), # 150g -> 0.15kg
            uom=self.uom_g
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_bun,
            quantity_required=Decimal("1.0000"),
            uom=self.uom_pcs
        )

        # Initial stocks: Chicken=10kg, Bun=50pcs
        order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.TO_PREPARE.value,
            total_price=Decimal("1950.00")
        )
        # Order 3 Burgers:
        # Chicken needed: 3 * 0.15kg = 0.45kg -> Remaining = 9.55kg
        # Buns needed: 3 * 1 = 3 pcs -> Remaining = 47 pcs
        # COGS: (0.45 * 800) + (3 * 30) = 360 + 90 = Rs.450.00
        order_item = OrderItem.objects.create(
            order=order,
            menu_item=self.menu_burger,
            quantity=3,
            price=Decimal("650.00")
        )

        # Transition order to PREPARED
        updated_order = OrderService.change_status(order, OrderStatus.PREPARED.value)

        # Verify stock decreased
        self.item_chicken.refresh_from_db()
        self.item_bun.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, Decimal("9.550"))
        self.assertEqual(self.item_bun.current_stock, Decimal("47.000"))

        # Verify Order COGS and idempotency flag
        updated_order.refresh_from_db()
        self.assertTrue(updated_order.inventory_deducted)
        self.assertEqual(updated_order.total_cogs, Decimal("450.00"))

        order_item.refresh_from_db()
        self.assertEqual(order_item.unit_cost_at_order, Decimal("150.00")) # 450 / 3

        # Verify StockMovementLog
        chicken_mov = StockMovementLog.objects.filter(
            inventory_item=self.item_chicken,
            movement_type=StockMovementType.ORDER_CONSUMPTION.value
        ).first()
        self.assertIsNotNone(chicken_mov)
        self.assertEqual(chicken_mov.quantity_delta, Decimal("-0.450"))
        self.assertEqual(chicken_mov.balance_after, Decimal("9.550"))
        self.assertEqual(chicken_mov.total_value, Decimal("360.00"))

    # 16. Insufficient stock rejection
    def test_insufficient_stock_rejection(self):
        recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger,
            yield_servings=Decimal("1.00")
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_chicken,
            quantity_required=Decimal("5.0000"), # 5 kg per burger
            uom=self.uom_kg
        )

        # Available stock is 10 kg, order 3 burgers -> requires 15 kg
        order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.PREPARED.value
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_burger,
            quantity=3,
            price=Decimal("650.00")
        )

        initial_stock = self.item_chicken.current_stock

        with self.assertRaises(ValidationError):
            RecipeConsumptionService.consume_order_inventory(order)

        # Verify no stock was deducted
        self.item_chicken.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, initial_stock)
        self.assertFalse(order.inventory_deducted)

    # 17. Missing recipe handling (does not error, does not consume)
    def test_missing_recipe_handling(self):
        # Drink has no recipe configured
        order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.PREPARED.value
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_drink,
            quantity=5,
            price=Decimal("150.00")
        )

        # Should complete gracefully with 0 COGS
        res_order, cogs = RecipeConsumptionService.consume_order_inventory(order)
        self.assertEqual(cogs, Decimal("0.00"))
        self.assertTrue(res_order.inventory_deducted)

    # 18. Duplicate consumption prevention (idempotency)
    def test_duplicate_consumption_is_prevented(self):
        recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger,
            yield_servings=Decimal("1.00")
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_bun,
            quantity_required=Decimal("1.0000"),
            uom=self.uom_pcs
        )

        order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.PREPARED.value
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_burger,
            quantity=2,
            price=Decimal("650.00")
        )

        # First consumption: -2 buns (50 -> 48)
        RecipeConsumptionService.consume_order_inventory(order)
        self.item_bun.refresh_from_db()
        self.assertEqual(self.item_bun.current_stock, Decimal("48.000"))

        # Second consumption attempt on same order: MUST NOT deduct again
        RecipeConsumptionService.consume_order_inventory(order)
        self.item_bun.refresh_from_db()
        self.assertEqual(self.item_bun.current_stock, Decimal("48.000"))

    # 19. Transaction rollback on multi-ingredient failure
    def test_transaction_rollback_on_ingredient_failure(self):
        # Ingredient 1: Bun (sufficient, 50 available)
        # Ingredient 2: Chicken (insufficient, 10 available, recipe requires 100 kg)
        recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger,
            yield_servings=Decimal("1.00")
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_bun,
            quantity_required=Decimal("1.0000"),
            uom=self.uom_pcs
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_chicken,
            quantity_required=Decimal("100.0000"), # 100 kg
            uom=self.uom_kg
        )

        order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.PREPARED.value
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_burger,
            quantity=1,
            price=Decimal("650.00")
        )

        with self.assertRaises(ValidationError):
            RecipeConsumptionService.consume_order_inventory(order)

        # Bun MUST NOT be deducted
        self.item_bun.refresh_from_db()
        self.assertEqual(self.item_bun.current_stock, Decimal("50.000"))
        self.assertEqual(StockMovementLog.objects.filter(inventory_item=self.item_bun).count(), 0)

    # 20. Tenant isolation
    def test_recipe_tenant_isolation(self):
        # Restaurant B Menu & Item
        menu_b = Menu.objects.create(restaurant=self.restaurant_b, name="B Menu")
        item_b = MenuItem.objects.create(menu=menu_b, name="B Burger", price=Decimal("500.00"))
        recipe_b = Recipe.objects.create(restaurant=self.restaurant_b, menu_item=item_b)

        # Manager A attempts to access Recipe B
        self.client.force_authenticate(user=self.manager_a_user)
        resp = self.client.get(f"/api/manager/recipes/{recipe_b.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # 21. Historical orders are not retroactively consumed
    def test_historical_orders_not_retroactively_consumed(self):
        # Old order created before recipe rollout
        old_order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.SERVED.value,
            inventory_deducted=False,
            total_cogs=Decimal("0.00")
        )
        initial_stock = self.item_chicken.current_stock

        # Creating a recipe now does NOT touch old_order stock
        Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger
        )
        self.item_chicken.refresh_from_db()
        self.assertEqual(self.item_chicken.current_stock, initial_stock)

    # 22. Recipe changes do not alter historical order COGS
    def test_recipe_changes_do_not_alter_historical_cogs(self):
        recipe = Recipe.objects.create(
            restaurant=self.restaurant_a,
            menu_item=self.menu_burger,
            yield_servings=Decimal("1.00")
        )
        RecipeItem.objects.create(
            recipe=recipe,
            inventory_item=self.item_bun,
            quantity_required=Decimal("1.0000"), # Rs.30.00
            uom=self.uom_pcs
        )

        order = Orders.objects.create(
            user=self.manager_a_profile,
            order_type=OrderType.DINE_IN.value,
            order_status=OrderStatus.PREPARED.value
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_burger,
            quantity=1,
            price=Decimal("650.00")
        )

        RecipeConsumptionService.consume_order_inventory(order)
        order.refresh_from_db()
        self.assertEqual(order.total_cogs, Decimal("30.00"))

        # Now change recipe to require 2 buns
        recipe_item = recipe.items.first()
        recipe_item.quantity_required = Decimal("2.0000") # Rs.60.00
        recipe_item.save(update_fields=["quantity_required"])

        # Historical order COGS MUST remain Rs.30.00
        order.refresh_from_db()
        self.assertEqual(order.total_cogs, Decimal("30.00"))
