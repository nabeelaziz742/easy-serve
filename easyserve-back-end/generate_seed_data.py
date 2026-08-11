import os
import django
import random
from decimal import Decimal
from datetime import datetime, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "coresite.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.restaurants.models import (
    Restaurant, Menu, MenuItem, MenuItemIngredient
)
from apps.userprofile.models import UserProfile
User = get_user_model()

# ---------------------------
# REAL DISHES & INGREDIENTS
# ---------------------------
REAL_DISHES = {
    "Pizza": [
        "Margherita Pizza",
        "Pepperoni Pizza",
        "BBQ Chicken Pizza",
        "Veggie Supreme Pizza",
        "Four-Cheese Pizza",
        "Hawaiian Pizza",
        "Spicy Chicken Fajita Pizza",
        "Mushroom Alfredo Pizza",
        "Tandoori Chicken Pizza",
        "Mediterranean Olive Pizza"
    ],

    "Fast Food": [
        "Classic Beef Burger",
        "Double Cheese Burger",
        "Fried Crispy Chicken",
        "Loaded Fries with Cheese",
        "Grilled Chicken Sandwich",
        "Buffalo Wings",
        "Crispy Chicken Wrap",
        "Zinger Burger",
        "Chicken Nuggets",
        "Beef Steak Sandwich"
    ],

    "Asian": [
        "Pad Thai",
        "Spicy Ramen Bowl",
        "Chicken Teriyaki",
        "Vegetable Fried Rice",
        "Beef Chow Mein",
        "Kung Pao Chicken",
        "Thai Green Curry",
        "Shrimp Dumplings",
        "Chicken Manchurian",
        "Sushi California Roll"
    ],

    "Indian": [
        "Butter Chicken",
        "Chicken Biryani",
        "Paneer Tikka Masala",
        "Dal Makhani",
        "Mutton Karahi",
        "Chicken Tandoori",
        "Aloo Paratha",
        "Fish Masala Curry",
        "Chana Masala",
        "Naan Garlic Bread"
    ],

    "Dessert": [
        "Chocolate Lava Cake",
        "Vanilla Ice Cream Sundae",
        "Strawberry Cheesecake",
        "Classic Tiramisu",
        "Brownie with Ice Cream",
        "Gulab Jamun",
        "Caramel Custard",
        "Red Velvet Slice",
        "Lemon Tart",
        "Blueberry Muffin"
    ],

    "Drinks": [
        "Fresh Lime Soda",
        "Iced Caramel Latte",
        "Mango Smoothie",
        "Strawberry Milkshake",
        "Classic Lemonade",
        "Mint Margarita",
        "Cold Brew Coffee",
        "Chocolate Shake",
        "Green Tea",
        "Peach Iced Tea"
    ],

    "BBQ": [
        "Grilled Chicken Breast",
        "Smoked Beef Ribs",
        "BBQ Lamb Chops",
        "Peri Peri Grilled Wings",
        "BBQ Platter Mix",
        "Smoked Sausage Combo",
        "Beef Steak Ribeye",
        "Barbeque Chicken Tikka",
        "Grilled Prawns",
        "Korean BBQ Short Ribs"
    ],

    "Breakfast": [
        "Pancakes with Maple Syrup",
        "Omelette with Cheese",
        "French Toast",
        "Beef Sausage Breakfast",
        "Avocado Toast",
        "Scrambled Eggs Meal",
        "Paratha with Omelette",
        "Breakfast Burrito",
        "Granola Yogurt Bowl",
        "Turkey Bacon & Eggs"
    ],

    "Healthy": [
        "Grilled Chicken Salad",
        "Quinoa Veggie Bowl",
        "Fresh Fruit Bowl",
        "Keto Chicken Alfredo",
        "Avocado Chicken Salad",
        "Caesar Salad",
        "Greek Salad",
        "Vegan Chickpea Bowl",
        "Protein Power Smoothie",
        "Hummus with Pita"
    ]
}

INGREDIENTS = {
    "Margherita Pizza": ["Flour Dough", "Tomatoes", "Fresh Basil", "Mozzarella Cheese"],
    "Pepperoni Pizza": ["Flour Dough", "Mozzarella", "Pepperoni"],
    "BBQ Chicken Pizza": ["Dough", "BBQ Sauce", "Chicken", "Onion"],
    "Pad Thai": ["Rice Noodles", "Egg", "Peanuts", "Chicken"],
    "Spicy Ramen Bowl": ["Ramen Noodles", "Egg", "Broth", "Chili"],
    "Chicken Teriyaki": ["Chicken", "Teriyaki Sauce", "Rice"],
    "Classic Beef Burger": ["Bun", "Beef Patty", "Lettuce", "Cheese"],
    "Chocolate Lava Cake": ["Chocolate", "Sugar", "Butter", "Eggs"],
}

RESTAURANT_NAMES = [
    "Sunset Grill", "Golden Kitchen", "Urban Spice", "Blue Lagoon Dining",
    "Red Dragon House", "Olive Tree Café", "Royal Feast",
    "Tasty Point", "Flavour Hub", "Chef's Table"
]

CITY_COUNTRY = [
    ("New York", "USA"), ("Mumbai", "India"), ("Paris", "France"),
    ("Dubai", "UAE"), ("Tokyo", "Japan"), ("Sydney", "Australia")
]

# ---------------------------
# GENERATION HELPERS
# ---------------------------

def generate_restaurant(index):
    name = f"{RESTAURANT_NAMES[index % len(RESTAURANT_NAMES)]}"
    city, country = CITY_COUNTRY[index % len(CITY_COUNTRY)]
    cuisine = random.choice(list(REAL_DISHES.keys()))
    return {
        "name": name,
        "city": city,
        "country": country,
        "address": f"{random.randint(1,300)} Main Street",
        "phone_number": f"+1-555-{random.randint(1000,9999)}",
        "email": name.replace(" ", "").lower() + "@demo.com",
        "cuisine": cuisine,
        "description": f"A great {cuisine} restaurant.",
        "created_at": datetime.now() - timedelta(days=random.randint(1,365))
    }

def generate_dishes(cuisine):
    dishes = REAL_DISHES[cuisine]
    selected = random.sample(dishes, min(10, len(dishes)))

    return [
        {
            "name": dish,
            "description": f"A delicious {dish.lower()} prepared fresh.",
            "price": round(random.uniform(5, 30), 2),
            "ingredients": INGREDIENTS.get(dish, ["Salt", "Pepper", "Oil"])
        }
        for dish in selected
    ]

# ---------------------------
# MAIN SEED FUNCTION
# ---------------------------

def seed(restaurants_count=10, menus_per_rest=10, items_per_menu=10):
    print("\n🚀 Starting Hybrid Seeder...\n")

    # Create owner
    owner, created = User.objects.get_or_create(
        email="owner1@example.com",
        defaults={
            "username": "owner1234",
            "is_active": True,
            "user_type": "restaurant_owner"
        }
    )
    if created:
        owner.set_password("owner123")
        owner.save()

    owner_profile, _ = UserProfile.objects.get_or_create(
        user=owner,
        first_name='restaurant',
        last_name='Owner',
    )

    # --------------------------------
    # CREATE RESTAURANTS
    # --------------------------------
    Restaurant.objects.all().delete()

    restaurants_to_create = [
        Restaurant(**generate_restaurant(i)) for i in range(restaurants_count)
    ]

    restaurants = Restaurant.objects.bulk_create(restaurants_to_create)

    for r in restaurants:
        r.owners.add(owner_profile)

    print(f"✅ Created {len(restaurants)} restaurants")

    # --------------------------------
    # CREATE MENUS
    # --------------------------------
    menus_to_create = []
    for r in restaurants:
        for i in range(1, menus_per_rest + 1):
            menus_to_create.append(Menu(
                restaurant=r,
                name=f"{r.cuisine} Specials {i}",
                description=f"Authentic {r.cuisine} dishes."
            ))

    menus = Menu.objects.bulk_create(menus_to_create)
    print(f"✅ Created {len(menus)} menus")

    # --------------------------------
    # CREATE MENU ITEMS + INGREDIENTS
    # --------------------------------
    items_to_create = []
    ingredients_to_create = []

    for menu in menus:
        dishes = generate_dishes(menu.restaurant.cuisine)

        for d in dishes[:items_per_menu]:
            item = MenuItem(
                menu=menu,
                name=d["name"],
                description=d["description"],
                price=Decimal(str(d["price"]))
            )
            items_to_create.append(item)

    menu_items = MenuItem.objects.bulk_create(items_to_create)

    # Now add ingredients
    for item in menu_items:
        ing_list = INGREDIENTS.get(item.name, ["Salt", "Pepper", "Oil"])
        for ing in ing_list:
            ingredients_to_create.append(
                MenuItemIngredient(
                    menu_item=item,
                    name=ing,
                    quantity="1 unit",
                    description=f"Ingredient for {item.name}"
                )
            )

    MenuItemIngredient.objects.bulk_create(ingredients_to_create)

    print(f"✅ Created {len(menu_items)} menu items")
    print(f"✅ Created {len(ingredients_to_create)} ingredients")
    print("\n🎉 Hybrid Seeder Completed!\n")


# Run seeder

if __name__ == "__main__":
    seed()
