"use client";

import { useGetMenuItemDetailQuery } from "@/services/public/resturants";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { UtensilsCrossed, Package, Tag } from "lucide-react";
import MenuPic from "@/assets/menuImgs/menu-pic.jpg"; // fallback image

export default function MenuItemDetail() {
  const param = useParams();

  const { data, isLoading } = useGetMenuItemDetailQuery(param.id, {
    skip: !param.id,
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4"
    >
      {/* Card Container */}
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-200">
        
        {/* Image */}
        <div className="relative">
          <Image
            src={data?.image || MenuPic}
            alt={data?.name}
            width={1000}
            height={500}
            className="w-full h-80 object-cover"
          />

          {/* Price Badge */}
          <span className="absolute bottom-4 right-4 bg-green-900 text-white text-lg font-bold px-5 py-2 rounded-xl shadow">
            Rs {data?.price}
          </span>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">

          
          {/* Title */}
          <h1 className="text-4xl font-extrabold text-gray-900">
            {data?.name}
          </h1>

          {/* Description */}
          <p className="text-gray-700 text-lg leading-relaxed">
            {data?.description}
          </p>

          {/* Category */}
          <div className="flex items-center gap-3 mt-4">
            <Tag className="text-blue-600" />
            <span className="font-semibold text-gray-800">
              {data?.category || "Uncategorized"}
            </span>
          </div>

          {/* Ingredients Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-green-900 mb-4">
              <UtensilsCrossed /> Ingredients
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.ingredients?.map((ing) => (
                <motion.div
                  key={ing.id}
                  whileHover={{ scale: 1.03 }}
                  className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3"
                >
                  <Package className="text-gray-500 mt-1" />

                  <div>

                    <h3 className="font-semibold text-lg text-gray-900">
                      {ing.name}
                    </h3>
                    <p className="text-sm text-gray-600">{ing.quantity}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ing.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
