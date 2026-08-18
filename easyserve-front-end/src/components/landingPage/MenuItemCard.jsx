"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Minus, Star } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addItem, increaseQty, decreaseQty } from "@/store/slices/cartSlice";
import { useRouter } from "next/navigation";
import MenuPic from "@/assets/menuImgs/menu-pic.jpg";

export const MenuItemCard = ({
  id,
  name,
  description,
  price,
  image,
  rating = 4.5,
  badge = "Recommended",
}) => {
  const router = useRouter();
  const dispatch = useDispatch();

  const dineIn = useSelector((state) => state.dineIn);

  const cartItem = useSelector((state) =>
    state.cart.items.find((i) => i.id === id)
  );
  const quantity = cartItem?.qty || 0;

  const getCartPayload = () => ({
    id,
    name,
    price,
    image,
    qty: 1,
    orderType: dineIn.active ? "DINE_IN" : "DELIVERY",
    restaurant: dineIn.active ? dineIn.restaurant?.id : null,
    table: dineIn.active ? dineIn.table : null,
  });

  const increment = () => {
    if (cartItem) dispatch(increaseQty(id));
    else dispatch(addItem(getCartPayload()));
  };

  const decrement = () => {
    if (cartItem && quantity > 0) dispatch(decreaseQty(id));
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 group cursor-pointer"
    >
      <div className="absolute top-3 left-3 bg-yellow-500 text-white text-sm font-semibold px-3 py-1 rounded-xl shadow-md z-20">
        {badge}
      </div>

      <div className="relative mb-4 z-10">
        <Image
          src={image || MenuPic}
          alt={name}
          width={400}
          height={250}
          className="rounded-xl object-cover w-full h-40 group-hover:brightness-110 transition"
        />

        <span className="absolute bottom-3 right-3 bg-green-900 text-white px-3 py-1 rounded-lg text-sm font-bold shadow z-20">
          Rs. {price}
        </span>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-1">{name}</h2>

      <div className="flex items-center gap-1 mb-3">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span className="font-semibold text-gray-800">{rating}</span>
        <span className="text-gray-400 text-sm">(200+)</span>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {description}
      </p>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={decrement}
          disabled={quantity === 0}
          className="bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md px-2 py-1"
        >
          <Minus size={16} />
        </button>

        <span className="text-lg font-semibold w-6 text-center">
          {quantity}
        </span>

        <button
          onClick={increment}
          className="bg-green-900 text-white rounded-md px-2 py-1 hover:bg-green-800 transition"
        >
          <Plus size={16} />
        </button>
      </div>

      <button
        onClick={increment}
        className="bg-green-900 text-white w-full font-semibold py-2 rounded-lg hover:bg-green-800 transition-colors shadow mb-3"
      >
        Add to Cart
      </button>

      <button
        onClick={() => router.push(`/item/${id}`)}
        className="bg-blue-600 text-white w-full font-semibold py-2 rounded-lg hover:bg-blue-500 transition shadow"
      >
        View Details
      </button>
    </motion.div>
  );
};
