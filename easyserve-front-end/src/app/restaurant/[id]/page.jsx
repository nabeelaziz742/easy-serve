"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Utensils, MapPin, Users, Sparkles, Phone } from "lucide-react";

import { MenuItemCard } from "@/components/landingPage/MenuItemCard";
import AIChatbot from "@/components/Aichatbot";
import { useGetRestaurantMenusQuery } from "@/services/public/resturants";
import { useValidateTableMutation } from "@/services/public/dineIn";
import { setDineInContext } from "@/store/slices/dineInSlice";

const DINE_IN_STORAGE_KEY = "easyserve:dine-in-context";

function Restaurant() {
  const param = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const dineIn = useSelector((state) => state.dineIn);

  const [validateTableMutation] = useValidateTableMutation();

  const [validatingQrTable, setValidatingQrTable] = useState(false);
  // Never read window/localStorage during the initial render. The previous
  // initializer produced different server/client markup and caused hydration
  // errors on QR dine-in pages.
  const [restoringDineIn, setRestoringDineIn] = useState(false);

  const qrTable = searchParams.get("table");
  const isQrDineIn = searchParams.get("mode") === "dine-in" && !!qrTable;

  useEffect(() => {
    if (!param?.id || !isQrDineIn) {
      setValidatingQrTable(false);
      return;
    }

    let cancelled = false;

    const validateQrTable = async () => {
      setValidatingQrTable(true);

      try {
        const response = await validateTableMutation({
          restaurant: param.id,
          table: qrTable,
        }).unwrap();

        if (cancelled) return;

        dispatch(
          setDineInContext({
            ...response,
            guests: null,
            name: "",
            phone: "",
            sessionToken: response.session?.token ?? null,
          })
        );

        window.localStorage.removeItem(DINE_IN_STORAGE_KEY);
        router.replace("/dine-in/guests");
      } catch (error) {
        if (cancelled) return;
        console.error("Table QR validation failed:", error);
        setValidatingQrTable(false);
        setRestoringDineIn(false);
      }
    };

    validateQrTable();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isQrDineIn, param?.id, qrTable, router, validateTableMutation]);

  useEffect(() => {
    if (
      !param?.id ||
      !window.location.search.includes("mode=dine-in") ||
      isQrDineIn
    ) {
      setRestoringDineIn(false);
      return;
    }

    if (dineIn.active) {
      setRestoringDineIn(false);
      return;
    }

    setRestoringDineIn(true);

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
  }, [dispatch, dineIn.active, isQrDineIn, param?.id]);

  const hasDineInMenus = (dineIn?.menus ?? []).some(
    (menu) => (menu?.menu_items?.length ?? 0) > 0
  );

  const { data } = useGetRestaurantMenusQuery(param.id, {
    skip: !param.id || (dineIn?.active && hasDineInMenus),
  });

  const restaurant = dineIn?.active ? dineIn.restaurant : data?.restaurant;
  const menus = hasDineInMenus ? dineIn.menus : data?.menus;

  if (validatingQrTable || restoringDineIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="rounded-3xl border border-yellow-400/20 bg-white px-8 py-7 text-center shadow-xl">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-yellow-500" />
          <p className="font-bold text-gray-900">Opening your table...</p>
          <p className="mt-1 text-xs text-gray-500">
            Preparing your personalized digital menu.
          </p>
        </div>
      </div>
    );
  }

  if (!restaurant) return null;
  if (dineIn.active && !dineIn.guests) return null;

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-800 border border-yellow-400/30">
                  <Sparkles className="h-3 w-3 text-yellow-600" /> Featured Restaurant
                </span>
                {dineIn.active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                    🍽️ Dine-In · Table #{dineIn.table.number} ({dineIn.guests || 1} Guests)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800 border border-green-200">
                    🚚 Online Ordering
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-green-950 sm:text-4xl">
                {restaurant.name}
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-gray-600 max-w-2xl">
                {restaurant.description ||
                  "Enjoy our exquisite cuisine freshly made to order."}
              </p>

              {restaurant.address && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-yellow-600" />
                  <span>{restaurant.address}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Menu Sections */}
        {menus?.map((menu) => (
          <div key={menu.id} className="mb-12">
            <div className="mb-6 flex items-center gap-2 border-b border-gray-200 pb-3">
              <Utensils className="h-5 w-5 text-yellow-600" />
              <h2 className="text-2xl font-extrabold tracking-tight text-green-950">
                {menu.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {menu.menu_items?.map((item) => (
                <MenuItemCard key={item.id} {...item} />
              ))}
            </div>
          </div>
        ))}

        {!menus?.length && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
            <Utensils className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-base font-bold text-gray-700">Menu is currently unavailable</p>
            <p className="mt-1 text-xs text-gray-400">Please check back shortly or consult your waiter.</p>
          </div>
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
