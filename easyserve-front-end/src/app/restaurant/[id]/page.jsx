"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { router } from "next/dist/client";

import { MenuItemCard } from "@/components/landingPage/MenuItemCard";

import AIChatbot from "@/components/Aichatbot";

import { useGetRestaurantMenusQuery } from "@/services/public/resturants";

function Restaurant() {

  const param = useParams();

  const dineIn = useSelector(
    (state) => state.dineIn
  );

  const { data } =
    useGetRestaurantMenusQuery(
      param.id,
      {
        skip:
          !param.id ||
          dineIn?.active,
      }
    );

  const restaurant =
    dineIn?.active
      ? dineIn.restaurant
      : data?.restaurant;

  const menus =
    dineIn?.active
      ? dineIn.menus
      : data?.menus;

  if (!restaurant) return null;

  if (
    dineIn.active &&
    !dineIn.guests
  ) {

    router
      .push("/dine-in/guests")
      .then();

    return null;
  }

  return (

    <section className="bg-gray-50 py-12 min-h-96">

      <div className="max-w-7xl mx-auto px-4">

        {/* Restaurant Heading */}

        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">

          {restaurant.name}

        </h1>

        {/* Description */}

        <p className="text-gray-500 text-center mb-10">

          {
            restaurant.description ||
            "Enjoy our exquisite cuisine from the comfort of your home"
          }

        </p>

        {/* Dine In */}

        {dineIn.active && (

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">

            <p className="font-semibold text-green-900">

              🍽️ Dine-In Order

            </p>

            <p className="text-sm text-green-700">

              Table #
              {
                dineIn.table.number
              }

              {" "}· Capacity{" "}

              {
                dineIn.table.capacity
              }

            </p>

            <p className="text-sm text-green-700">

              Guests:
              {" "}

              {
                dineIn.guests ||
                "Not set"
              }

            </p>

          </div>
        )}

        {/* Online Order */}

        {!dineIn.active && (

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">

            <p className="font-semibold text-green-900">

              🍽️ Online Order

            </p>

          </div>
        )}

        {/* Menus */}

        {menus?.map((menu) => (

          <div key={menu.id}>

            <h2 className="text-2xl font-bold text-green-900 mb-6">

              {menu.name}

            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

              {menu.menu_items.map(
                (item) => (

                  <MenuItemCard
                    key={item.id}
                    {...item}
                  />

                )
              )}

            </div>

          </div>
        ))}

      </div>

      {/* AI CHATBOT */}

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

