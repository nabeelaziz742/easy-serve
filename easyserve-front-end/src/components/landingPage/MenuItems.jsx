"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Utensils } from "lucide-react";
import { MenuItemCard } from "@/components/landingPage/MenuItemCard";
import {
  useGetTopAIMenuItemSuggestionsQuery,
  useGetAIRecommendedMenuItemQuery,
} from "@/services/public/resturants";

const MenuSkeletonCard = () => (
  <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
    <div className="h-40 w-full rounded-2xl bg-gray-200 mb-4" />
    <div className="h-5 w-3/4 rounded bg-gray-200 mb-2" />
    <div className="h-4 w-1/2 rounded bg-gray-100 mb-4" />
    <div className="h-10 w-full rounded-xl bg-gray-200" />
  </div>
);

export default function MenuSection() {
  const { data: aiResponse, isLoading: aiLoading } =
    useGetTopAIMenuItemSuggestionsQuery();

  const { data: aiRecommendResponse, isLoading: aiRLoading } =
    useGetAIRecommendedMenuItemQuery();

  const aiMenuItemSuggestions = aiResponse || [];
  const aiRecommendMenuItemSuggestions = aiRecommendResponse || [];

  const isLoading = aiLoading || aiRLoading;

  return (
    <section className="bg-gradient-to-b from-white via-gray-50 to-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* MAIN TITLE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800">
            <Sparkles className="h-3.5 w-3.5 text-yellow-600" /> Chef's Recommendations
          </span>
          <h2 className="text-4xl font-black tracking-tight text-green-950 md:text-5xl">
            Discover Delicious Dishes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Explore trending, recommended, and top-rated culinary creations curated specially for you.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-12">
            <div>
              <div className="mb-6 h-8 w-64 rounded-xl bg-gray-200 animate-pulse" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <MenuSkeletonCard key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ========================== AI SUGGESTIONS ========================== */}
            {aiMenuItemSuggestions?.length > 0 && (
              <SectionBlock
                title="AI Suggested Specials"
                emoji="🔥"
                items={aiMenuItemSuggestions}
              />
            )}

            {/* ========================== RECOMMENDED ========================== */}
            {aiRecommendMenuItemSuggestions?.length > 0 && (
              <SectionBlock
                title="Recommended For You"
                emoji="✨"
                items={aiRecommendMenuItemSuggestions}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

const SectionBlock = ({ title, emoji, items }) => (
  <div className="mb-14">
    <div className="mb-6 flex items-center gap-2.5">
      <span className="text-xl">{emoji}</span>
      <h3 className="text-2xl font-extrabold tracking-tight text-green-950">
        {title}
      </h3>
    </div>

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <MenuItemCard key={item.id} {...item} />
      ))}
    </div>
  </div>
);
