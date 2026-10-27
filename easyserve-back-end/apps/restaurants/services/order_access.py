def get_order_restaurant_id(order):
    """Return the id of the restaurant an order belongs to, or None."""
    if order.table_id:
        return order.table.restaurant_id
    if order.dine_in_session_id:
        return order.dine_in_session.restaurant_id
    return (
        order.items
        .values_list("menu_item__menu__restaurant_id", flat=True)
        .first()
    )


def staff_belongs_to_order_restaurant(user, order):
    """True when a staff user works at (or owns) the order's restaurant."""
    if getattr(user, "user_type", None) == "super_admin":
        return True

    restaurant_id = get_order_restaurant_id(order)
    profile = getattr(user, "profile", None)
    if restaurant_id is None or profile is None:
        return False

    return (
        profile.restaurant_id == restaurant_id
        or profile.owned_restaurants.filter(id=restaurant_id).exists()
    )


def staff_restaurant_ids(user):
    """Ids of the restaurants a staff user works at or owns."""
    profile = getattr(user, "profile", None)
    if profile is None:
        return []
    ids = set(profile.owned_restaurants.values_list("id", flat=True))
    if profile.restaurant_id:
        ids.add(profile.restaurant_id)
    if getattr(profile, "selected_restaurant", None):
        ids.add(profile.selected_restaurant)
    return list(ids)
