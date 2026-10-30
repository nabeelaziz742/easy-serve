"use client";

import React, { Suspense, useState } from "react";
import {
  MapPin,
  Phone,
  Utensils,
  Star,
  CalendarCheck,
} from "lucide-react";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useGetRestaurantsQuery,
  useGetTopAISuggestionsQuery,
} from "@/services/public/resturants";


// ===================== RESTAURANT CARD =====================

import EmptyState from "@/components/feedback/EmptyState";
import { openingStatus } from "@/utilities/openingHours";
import ReservationDialog from "@/components/reservations/ReservationDialog";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const RestaurantSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <Skeleton circle width={48} height={48} />
      <div className="flex-1">
        <Skeleton height={18} />
        <Skeleton width={110} height={14} />
      </div>
    </div>
    <div className="mt-3">
      <Skeleton count={2} height={14} />
    </div>
    <div className="mt-3">
      <Skeleton height={36} borderRadius={12} />
    </div>
  </div>
);


const RestaurantCard = ({
  id,
  name,
  description,
  address,
  phone,
  logo,
  hours,
  rating = 4.5,
  deliveryTime = "25–35 min",
  badge = "Recommended",
  isReservationMode,
  onReserve,
}) => {

  const router = useRouter();
  const status = openingStatus(hours);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
      onClick={() => {
        if (isReservationMode) {
          onReserve({ id, name, logo, hours });
        } else {
          router.push(`/restaurant/${id}`);
        }
      }}
    >

      {/* Top Gradient */}
      <div className="h-1 w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-green-700" />

      <span className="absolute right-3 top-3 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black">
        {badge}
      </span>

      <div className="flex flex-1 flex-col p-4">

        {/* Icon + Name + Rating */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-100 to-yellow-100 transition-transform duration-300 group-hover:scale-110">
            {logo ? (
              <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
            ) : (
              <Utensils className="h-6 w-6 text-green-900" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate pr-20 text-base font-extrabold text-gray-900">{name}</h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-semibold text-yellow-600">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                {rating}
              </span>
              <span className="text-gray-400">•</span>
              {status ? (
                <span className={`whitespace-nowrap font-semibold ${status.open ? "text-emerald-700" : "text-red-600"}`}>
                  {status.label}
                </span>
              ) : (
                <span className="whitespace-nowrap font-medium text-gray-500">{deliveryTime}</span>
              )}
            </div>
          </div>
        </div>

        {description && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-600">{description}</p>
        )}

        {/* Address + Phone */}
        <div className="mt-3 space-y-1.5 text-xs text-gray-700">
          {address && (
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-green-700" />
              <span className="truncate">{address}</span>
            </p>
          )}
          {phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-green-700" />
              <span>{phone}</span>
            </p>
          )}
        </div>

        {/* Button */}
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-xl bg-green-900 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-green-800">
            {isReservationMode ? "Book a Table" : "View Menu"}
          </button>
          {!isReservationMode && (
            <button
              type="button"
              title="Book a table"
              onClick={(event) => {
                event.stopPropagation();
                onReserve({ id, name, logo, hours });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-400 bg-yellow-50 px-3 text-xs font-bold text-yellow-900 transition-colors hover:bg-yellow-100"
            >
              <CalendarCheck className="h-4 w-4" /> Book
            </button>
          )}
        </div>

      </div>
    </motion.div>
  );
};

// Re-check the lists so a restaurant the super admin disables (or enables)
// drops off (or appears) without a page refresh.
const LIVE = { pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true };

function RestaurantsListContent() {

  const { data: allRestaurants, isLoading: restaurantsLoading } =
    useGetRestaurantsQuery(undefined, LIVE);

  const {
    data: aiSuggestions,
    isLoading: aiLoading,
  } = useGetTopAISuggestionsQuery(undefined, LIVE);

  const searchParams = useSearchParams();
  const [bookingFor, setBookingFor] = useState(null);

  const isReservationMode =
    searchParams.get("mode") === "reservation";

  // The API can answer with a paginated object or a plain list.
  const aiResults = Array.isArray(aiSuggestions?.results)
    ? aiSuggestions.results
    : Array.isArray(aiSuggestions)
    ? aiSuggestions
    : [];

  const restaurants = Array.isArray(allRestaurants)
    ? allRestaurants
    : Array.isArray(allRestaurants?.results)
    ? allRestaurants.results
    : [];

  return (
    <section id="restaurants" className="bg-gradient-to-b from-gray-50 to-white py-24 scroll-mt-12">
      <ReservationDialog restaurant={bookingFor} onClose={() => setBookingFor(null)} />

      <div className="mx-auto max-w-7xl px-5">

        {/* ===================== PAGE HEADER ===================== */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >

          <div
            className="
              mb-4
              inline-flex
              rounded-full
              bg-green-100
              px-5
              py-2
              text-sm
              font-medium
              text-green-800
            "
          >
            🍽️ Premium Dining Experience
          </div>

          <h1
            className="
              text-5xl
              font-extrabold
              leading-tight
              text-green-950
              md:text-6xl
            "
          >
            {isReservationMode
              ? "Reserve Your Table"
              : "Explore Restaurants"}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">

            {isReservationMode
              ? "Choose your favorite restaurant, check availability, and reserve your table instantly."
              : "Discover AI recommended, top-rated, and trending restaurants near you."}

          </p>

        </motion.div>


        {/* ===================== RESERVATION INFO ===================== */}

        {isReservationMode && (

          <div
            className="
              mb-14
              rounded-3xl
              border
              border-green-200
              bg-green-50
              p-8
              shadow-sm
            "
          >

            <p className="mb-2 text-xl font-bold text-green-900">
              🍽️ Table Reservation
            </p>

            <p className="mb-6 text-green-700">
              Reserve your table in advance for a smooth dining experience.
            </p>

            <div className="grid gap-5 text-sm text-green-800 sm:grid-cols-2">

              <div className="rounded-xl bg-white p-4">
                <span className="font-semibold">
                  Availability:
                </span>{" "}
                Peak & off-peak hours supported
              </div>

              <div className="rounded-xl bg-white p-4">
                <span className="font-semibold">
                  Seating:
                </span>{" "}
                Solo, couple, family & group tables
              </div>

              <div className="rounded-xl bg-white p-4">
                <span className="font-semibold">
                  Confirmation:
                </span>{" "}
                Booking number at once, the restaurant confirms it
              </div>

              <div className="rounded-xl bg-white p-4">
                <span className="font-semibold">
                  Requests:
                </span>{" "}
                Special notes supported
              </div>

            </div>
          </div>
        )}


        {/* ===================== AI SECTION ===================== */}

        {(aiLoading || aiResults.length > 0) && (
        <div className="mb-20">

          <div className="mb-8 flex items-center justify-between">

            <h2 className="text-3xl font-bold text-green-950">
              ⭐ AI Top Restaurant Suggestions
            </h2>

          </div>

          {aiLoading ? (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

    {[1, 2, 3].map((item) => (
      <RestaurantSkeleton key={item} />
    ))}

  </div>

) : (

  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

    {aiResults.map((item, index) => (

      <RestaurantCard
        key={item.restaurant.id}
        id={item.restaurant.id}
        name={item.restaurant.name}
        description={item.restaurant.description}
        address={item.restaurant.address}
        phone={item.restaurant.phone_number}
        logo={item.restaurant.logo}
        hours={item.restaurant.hours}
        rating={item.avg_rating?.toFixed(1)}
        deliveryTime={`${20 + index * 2}-${30 + index * 2} min`}
        badge="AI Recommended"
        isReservationMode={isReservationMode}
        onReserve={setBookingFor}
      />

    ))}

  </div>

)}
        </div>
        )}


        {/* ===================== ALL RESTAURANTS ===================== */}

        <div>

          <h2 className="mb-8 text-3xl font-bold text-green-950">
            🍽️ All Restaurants
          </h2>

          {restaurantsLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3].map((item) => (
                <RestaurantSkeleton key={item} />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="No restaurants listed yet"
              description="Restaurants will appear here as soon as they go live. Already at a table? Scan the QR code on it to order."
              action={
                <a
                  href="/scan"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-950 px-4 py-2 text-xs font-bold text-yellow-400 transition-colors hover:bg-green-900"
                >
                  Scan table QR
                </a>
              }
            />
          ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {restaurants.map((restaurant, index) => (

              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                phone={restaurant.phone_number}
                logo={restaurant.logo}
                hours={restaurant.hours}
                address={restaurant.address}
                name={restaurant.name}
                description={restaurant.description}
                rating={(4 + Math.random()).toFixed(1)}
                deliveryTime={`${20 + index * 2}-${30 + index * 2} min`}
                badge={
                  index % 3 === 0
                    ? "Top Rated"
                    : index % 2 === 0
                    ? "Popular"
                    : "Recommended"
                }
                isReservationMode={isReservationMode}
        onReserve={setBookingFor}
              />

            ))}

          </div>
          )}
        </div>

      </div>
    </section>
  );
}

export default function RestaurantsList() {
  return (
    <Suspense fallback={<RestaurantSkeleton />}>
      <RestaurantsListContent />
    </Suspense>
  );
}