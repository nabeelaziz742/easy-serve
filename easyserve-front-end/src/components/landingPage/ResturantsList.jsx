"use client";

import React, { Suspense } from "react";
import {
  MapPin,
  Phone,
  Utensils,
  Star,
} from "lucide-react";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useGetRestaurantsQuery,
  useGetTopAISuggestionsQuery,
} from "@/services/public/resturants";


// ===================== RESTAURANT CARD =====================

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const RestaurantSkeleton = () => {

  return (
    <div
      className="
        overflow-hidden
        rounded-3xl
        border
        border-gray-200
        bg-white
        p-7
        shadow-lg
      "
    >

      <Skeleton height={8} />

      <div className="mt-6 flex justify-center">
        <Skeleton circle width={90} height={90} />
      </div>

      <div className="mt-6">
        <Skeleton height={30} />
      </div>

      <div className="mt-4 flex justify-center gap-4">
        <Skeleton width={70} height={25} />
        <Skeleton width={90} height={25} />
      </div>

      <div className="mt-5">
        <Skeleton count={2} />
      </div>

      <div className="mt-6 space-y-3">
        <Skeleton height={50} />
        <Skeleton height={50} />
      </div>

      <div className="mt-6">
        <Skeleton height={45} borderRadius={16} />
      </div>

    </div>
  );
};


const RestaurantCard = ({
  id,
  name,
  description,
  address,
  phone,
  rating = 4.5,
  deliveryTime = "25–35 min",
  badge = "Recommended",
  isReservationMode,
}) => {

  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -8 }}
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-gray-200
        bg-white
        shadow-lg
        transition-all
        duration-300
        hover:shadow-2xl
        cursor-pointer
      "
      onClick={() => {
        if (isReservationMode) {
          router.push(`/reservation?restaurant=${id}`);
        } else {
          router.push(`/restaurant/${id}`);
        }
      }}
    >

      {/* Top Gradient */}
      <div className="h-2 w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-green-700" />

      {/* Badge */}
      <div
        className="
          absolute
          right-4
          top-5
          z-20
          rounded-full
          bg-yellow-400
          px-4
          py-1
          text-xs
          font-bold
          text-black
          shadow-lg
        "
      >
        {badge}
      </div>

      {/* Card Content */}
      <div className="p-7">

        {/* Icon */}
        <div
          className="
            mx-auto
            mb-5
            flex
            h-24
            w-24
            items-center
            justify-center
            rounded-full
            bg-gradient-to-br
            from-green-100
            to-yellow-100
            shadow-inner
            transition-all
            duration-300
            group-hover:scale-110
          "
        >

          <Utensils className="h-11 w-11 text-green-900" />

        </div>

        {/* Restaurant Name */}
        <h2
          className="
            mb-2
            text-center
            text-2xl
            font-extrabold
            text-gray-900
          "
        >
          {name}
        </h2>

        {/* Rating */}
        <div
          className="
            mb-5
            flex
            items-center
            justify-center
            gap-5
          "
        >

          <div
            className="
              flex
              items-center
              gap-1
              rounded-full
              bg-yellow-50
              px-3
              py-1
              text-sm
              font-semibold
              text-yellow-600
            "
          >

            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />

            {rating}

          </div>

          <span className="text-sm font-medium text-gray-500">
            {deliveryTime}
          </span>

        </div>

        {/* Description */}
        <p
          className="
            mb-6
            line-clamp-2
            text-center
            text-sm
            leading-relaxed
            text-gray-600
          "
        >
          {description}
        </p>

        {/* Address + Phone */}
        <div className="mb-6 space-y-3 text-sm text-gray-700">

          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              bg-gray-50
              p-3
            "
          >

            <MapPin className="mt-0.5 h-4 w-4 text-green-700" />

            <span className="line-clamp-2">
              {address}
            </span>

          </div>

          <div
            className="
              flex
              items-center
              gap-3
              rounded-xl
              bg-gray-50
              p-3
            "
          >

            <Phone className="h-4 w-4 text-green-700" />

            <span>{phone}</span>

          </div>

        </div>

        {/* Button */}
        <button
          className="
            w-full
            rounded-2xl
            bg-green-900
            py-3
            font-semibold
            text-white
            shadow-lg
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:bg-green-800
          "
        >
          {isReservationMode
            ? "Select Restaurant"
            : "View Menu"}
        </button>

      </div>
    </motion.div>
  );
};


// ===================== MAIN PAGE =====================

function RestaurantsListContent() {

  const { data: allRestaurants } =
    useGetRestaurantsQuery();

  const {
    data: aiSuggestions,
    isLoading: aiLoading,
  } = useGetTopAISuggestionsQuery();

  const searchParams = useSearchParams();

  const isReservationMode =
    searchParams.get("mode") === "reservation";

  const aiRestaurants = aiSuggestions || [];

  const restaurants = allRestaurants || [];

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-24">

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
                Instant booking confirmation
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

        <div className="mb-20">

          <div className="mb-8 flex items-center justify-between">

            <h2 className="text-3xl font-bold text-green-950">
              ⭐ AI Top Restaurant Suggestions
            </h2>

          </div>

          {aiLoading ? (

            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">

    {[1, 2, 3].map((item) => (
      <RestaurantSkeleton key={item} />
    ))}

  </div>

) : (

  <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">

    {aiRestaurants.results?.map((item, index) => (

      <RestaurantCard
        key={item.restaurant.id}
        id={item.restaurant.id}
        name={item.restaurant.name}
        description={item.restaurant.description}
        address={item.restaurant.address}
        phone={item.restaurant.phone_number}
        rating={item.avg_rating?.toFixed(1)}
        deliveryTime={`${20 + index * 2}-${30 + index * 2} min`}
        badge="AI Recommended"
        isReservationMode={isReservationMode}
      />

    ))}

  </div>

)}
        </div>


        {/* ===================== ALL RESTAURANTS ===================== */}

        <div>

          <h2 className="mb-8 text-3xl font-bold text-green-950">
            🍽️ All Restaurants
          </h2>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">

            {restaurants.map((restaurant, index) => (

              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                phone={restaurant.phone_number}
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
              />

            ))}

          </div>
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