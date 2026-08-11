"use client";

import React from "react";
import { MenuItemCard } from "@/components/landingPage/MenuItemCard";
import {
  useGetTopAIMenuItemSuggestionsQuery,
  useGetAIRecommendedMenuItemQuery
} from "@/services/public/resturants";


export default function MenuSection() {

  const { data: aiResponse, isLoading: aiLoading } =
    useGetTopAIMenuItemSuggestionsQuery();

  const { data: aiRecommendResponse, isLoading: aiRLoading } =
    useGetAIRecommendedMenuItemQuery();

  const aiMenuItemSuggestions = aiResponse || [];

  const aiRecommendMenuItemSuggestions = aiRecommendResponse || [];

  if (aiRLoading) return <p>Recommended Menu Item Loading...</p>;

  if (aiLoading) return <p>Menu Item Suggestions Loading...</p>;

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* MAIN TITLE */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-blue-700">
            Discover Delicious Dishes
          </h1>
          <p className="text-gray-600 mt-2">
            Explore trending, recommended, and top-rated dishes — just for you.
          </p>
        </div>

        {/* ========================== TRENDING ========================== */}
        {aiMenuItemSuggestions?.length > 0 && (
          <SectionBlock
            title="🔥 AI Suggestions Menu Items"
            items={aiMenuItemSuggestions}
          />
        )}

        {/* ========================== RECOMMENDED ========================== */}
        {aiRecommendMenuItemSuggestions?.length > 0 && (
          <SectionBlock
            title="❤️ Recommended For You"
            items={aiRecommendMenuItemSuggestions}
          />
        )}

        {/* ========================== MOST POPULAR ========================== */}

        {/*{aiTopRatedItems?.length > 0 && (*/}
        {/*  <SectionBlock */}
        {/*    title="⭐ Top Rated Dishes" */}
        {/*    items={aiTopRatedItems} */}
        {/*  />*/}
        {/*)}*/}

      </div>
    </section>
  );
}

const SectionBlock = ({ title, items }) => (
  <>
    <h2 className="text-2xl font-bold text-green-900 mb-6">{title}</h2>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
      {items.map((item) => (
        <MenuItemCard key={item.id} {...item} />
      ))}
    </div>
  </>
);
