"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";

import { MenuItemCard } from "@/components/landingPage/MenuItemCard";
import AIChatbot from "@/components/Aichatbot";
import { useGetRestaurantMenusQuery } from "@/services/public/resturants";
import { setDineInContext } from "@/store/slices/dineInSlice";

const DINE_IN_STORAGE_KEY = "easyserve:dine-in-context";

function Restaurant() {
  const param = useParams();
  const dispatch = useDispatch();
  const dineIn = useSelector((state) => state.dineIn);
  const [restoringDineIn, setRestoringDineIn] = useState(
    () => param?.id && typeof window !== "undefined" && window.location.search.includes("mode=dine-in")
  );

  // Dine-in validation can restore menu metadata without menu items.
  // Only treat the restored menus as usable when they actually contain items.
  const hasDineInMenus = (dineIn?.menus ?? []).some(
    (menu) => (menu?.menu_items?.length ?? 0) > 0
  );

  const { data } = useGetRestaurantMenusQuery(param.id, {
    skip: !param.id || (dineIn?.active && hasDineInMenus),
  });

  useEffect(() => {
    if (!param?.id || !window.location.search.includes("mode=dine-in")) {
      setRestoringDineIn(false);
      return;
    }

    if (dineIn.active) {
      setRestoringDineIn(false);
      return;
    }

    try {
      const raw = window.localStorage.getItem(DINE_IN_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;

      if (
        saved?.active &&
        saved?.restaurant?.id?.toString() === param.id?.toString() &&
        saved?.table?.number
      ) {
        dispatch(setDineInContext(saved));
      }
    } catch (error) {
      console.error("Failed to restore dine-in context:", error);
      window.localStorage.removeItem(DINE_IN_STORAGE_KEY);
    } finally {
      setRestoringDineIn(false);
    }
  }, [dispatch, dineIn.active, param?.id]);

  const restaurant = dineIn?.active
    ? dineIn.restaurant
    : data?.restaurant;

  // Dine-in validation normally provides menus. If that payload is empty,
  // fall back to the public restaurant-menu endpoint so the customer can
  // still browse the menu instead of seeing a blank screen.
  const menus = hasDineInMenus ? dineIn.menus : data?.menus;

  if (restoringDineIn) return null;
  if (!restaurant) return null;

  if (dineIn.active && !dineIn.guests) return null;

  return (
    <section className="bg-gray-50 py-12 min-h-96">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">
          {restaurant.name}
        </h1>

        <p className="text-gray-500 text-center mb-10">
          {restaurant.description ||
            "Enjoy our exquisite cuisine from the comfort of your home"}
        </p>

        {dineIn.active ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="font-semibold text-green-900">🍽️ Dine-In Order</p>
            <p className="text-sm text-green-700">
              Table #{dineIn.table.number} · Capacity {dineIn.table.capacity}
            </p>
            <p className="text-sm text-green-700">
              Guests: {dineIn.guests || "Not set"}
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="font-semibold text-green-900">🍽️ Online Order</p>
          </div>
        )}

        {menus?.map((menu) => (
          <div key={menu.id}>
            <h2 className="text-2xl font-bold text-green-900 mb-6">
              {menu.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {menu.menu_items?.map((item) => (
                <MenuItemCard key={item.id} {...item} />
              ))}
            </div>
          </div>
        ))}

        {!menus?.length && (
          <p className="text-center text-gray-500 py-10">
            Menu is currently unavailable.
          </p>
        )}
      </div>

      <AIChatbot
        restaurant={{
          ...restaurant,
          menus,
        }}
      />
    </section>
  );
}

export default Restaurant;
