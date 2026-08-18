"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { MenuItemCardStable } from "@/components/landingPage/MenuItemCardStable";
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
      isQrDineIn ||
      dineIn.active
    ) {
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
        <div className="rounded-2xl border border-green-100 bg-white px-8 py-7 text-center shadow-lg">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
          <p className="font-semibold text-gray-900">Opening your table...</p>
          <p className="mt-1 text-sm text-gray-500">Preparing the dine-in menu.</p>
        </div>
      </div>
    );
  }

  if (!restaurant) return null;
  if (dineIn.active && !dineIn.guests) return null;

  return (
    <section className="min-h-96 bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-2 text-center text-3xl font-bold text-blue-700">{restaurant.name}</h1>
        <p className="mb-10 text-center text-gray-500">
          {restaurant.description || "Enjoy our exquisite cuisine from the comfort of your table"}
        </p>
        {dineIn.active ? (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-900">🍽️ Dine-In Order</p>
            <p className="text-sm text-green-700">
              Table #{dineIn.table.number} · Capacity {dineIn.table.capacity}
            </p>
            <p className="text-sm text-green-700">Guests: {dineIn.guests || "Not set"}</p>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-900">🍽️ Online Order</p>
          </div>
        )}
        {menus?.map((menu) => (
          <div key={menu.id}>
            <h2 className="mb-6 text-2xl font-bold text-green-900">{menu.name}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {menu.menu_items?.map((item) => (
                <MenuItemCardStable key={item.id} {...item} />
              ))}
            </div>
          </div>
        ))}
        {!menus?.length && (
          <p className="py-10 text-center text-gray-500">Menu is currently unavailable.</p>
        )}
      </div>
      <AIChatbot restaurant={{ ...restaurant, menus }} />
    </section>
  );
}

export default function RestaurantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="rounded-2xl border border-green-100 bg-white px-8 py-7 text-center shadow-lg">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
            <p className="font-semibold text-gray-900">Opening your table...</p>
            <p className="mt-1 text-sm text-gray-500">Preparing the dine-in menu.</p>
          </div>
        </div>
      }
    >
      <Restaurant />
    </Suspense>
  );
}
