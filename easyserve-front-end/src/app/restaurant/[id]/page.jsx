"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Utensils, MapPin, Users, Sparkles, Phone, Clock, CalendarCheck } from "lucide-react";

import { MenuItemCard } from "@/components/landingPage/MenuItemCard";
import AIChatbot from "@/components/Aichatbot";
import { useGetRestaurantMenusQuery, useGetRestaurantQuery } from "@/services/public/resturants";
import { useValidateTableMutation } from "@/services/public/dineIn";
import { setDineInContext } from "@/store/slices/dineInSlice";
import { onBecameGuest } from "@/store/slices/authSlice";
import { readSession } from "@/utilities/authStorage";
import { clearSavedDineIn, readSavedDineIn } from "@/utilities/dineInStorage";
import { openingStatus } from "@/utilities/openingHours";
import ReservationDialog from "@/components/reservations/ReservationDialog";

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
  const [booking, setBooking] = useState(false);

  const qrTable = searchParams.get("table");
  // The table's secret from the printed QR. Without it the backend will
  // not open the table, so a guessed link cannot order to someone's table.
  const qrKey = searchParams.get("key") ?? "";
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
          key: qrKey,
        }).unwrap();

        if (cancelled) return;

        dispatch(
          setDineInContext({
            ...response,
            guests: null,
            name: "",
            phone: "",
            sessionToken: response.session?.token ?? null,
            qrKey,
          })
        );

        clearSavedDineIn();

        // A new tab adopts the browser's latest login, which on a shared or
        // staff device can be the waiter or manager. The person scanning the
        // table QR is a customer, so this tab continues as a guest; other
        // tabs keep their logins. A signed-in customer stays signed in.
        const role = readSession()?.user?.user_type;
        if (role && role !== "user") {
          dispatch(onBecameGuest());
        }

        router.replace("/dine-in/guests");
      } catch (error) {
        if (cancelled) return;
        console.error("Table QR validation failed:", error);
        toast.error(
          error?.data?.detail ||
            "This table QR code is not valid. Please scan the QR code on your table."
        );
        setValidatingQrTable(false);
        setRestoringDineIn(false);
      }
    };

    validateQrTable();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isQrDineIn, param?.id, qrKey, qrTable, router, validateTableMutation]);

  useEffect(() => {
    if (!param?.id || isQrDineIn)  {
      setRestoringDineIn(false);
      return;
    }

    if (dineIn.active) {
      setRestoringDineIn(false);
      return;
    }

    setRestoringDineIn(true);

    const saved = readSavedDineIn();
    if (
      saved?.active &&
      saved?.restaurant?.id?.toString() === param.id?.toString() &&
      saved?.table?.number
    ) {
      dispatch(setDineInContext(saved));
    }
    setRestoringDineIn(false);
  }, [dispatch, dineIn.active, isQrDineIn, param?.id]);

  const hasDineInMenus = (dineIn?.menus ?? []).some(
    (menu) => (menu?.menu_items?.length ?? 0) > 0
  );

  const { data, isLoading: menuLoading, isError: menuError } = useGetRestaurantMenusQuery(param.id, {
    skip: !param.id || (dineIn?.active && hasDineInMenus),
  });

  // Polled so the page closes by itself when the super admin disables the
  // restaurant (the API then answers 404), for dine-in guests too.
  const { error: availabilityError } = useGetRestaurantQuery(param.id, {
    skip: !param.id,
    pollingInterval: 10000,
    refetchOnFocus: true,
  });
  const disabled = availabilityError?.status === 404;

  const restaurant = disabled ? null : dineIn?.active ? dineIn.restaurant : data?.restaurant;
  const menus = hasDineInMenus ? dineIn.menus : data?.menus;
  const openStatus = openingStatus(restaurant?.hours);

  if (validatingQrTable || restoringDineIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-yellow-400/20 bg-white px-8 py-7 text-center shadow-xl">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-yellow-500" />
          <p className="font-bold text-gray-900">Opening your table...</p>
          <p className="mt-1 text-xs text-gray-500">
            Preparing your personalized digital menu.
          </p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    if (menuError || disabled) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="saas-card w-full max-w-md p-6 text-center shadow-md">
            <Utensils className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="font-bold text-gray-900">Restaurant not found</p>
            <p className="mt-1 text-xs text-gray-500">This menu link is not available right now. Check the link or scan your table QR again.</p>
            <a
              href="/"
              className="mt-4 inline-flex rounded-lg bg-green-950 px-4 py-2 text-xs font-bold text-yellow-400 transition-colors hover:bg-green-900"
            >
              Back to home
            </a>
          </div>
        </div>
      );
    }
    return (
      <section className="min-h-[70vh] bg-gray-50 py-10" aria-busy={menuLoading}>
        <div className="mx-auto max-w-7xl animate-pulse space-y-8 px-4 sm:px-6">
          <div className="h-32 rounded-2xl bg-gray-200/70" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-gray-200/60" />
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (dineIn.active && !dineIn.guests) return null;

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm"
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

              {openStatus && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  <span className={`font-semibold ${openStatus.open ? "text-emerald-700" : "text-red-600"}`}>
                    {openStatus.label}
                  </span>
                </div>
              )}
            </div>

            {!dineIn.active && (
              <button
                type="button"
                onClick={() => setBooking(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300"
              >
                <CalendarCheck className="h-4 w-4" /> Book a Table
              </button>
            )}
          </div>
        </motion.div>

        <ReservationDialog
          restaurant={booking ? { ...restaurant, id: restaurant.id ?? Number(param.id) } : null}
          onClose={() => setBooking(false)}
        />

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
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
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
