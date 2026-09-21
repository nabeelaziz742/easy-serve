"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Minus, Star, ShoppingCart } from "lucide-react";
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

  const increment = (e) => {
    e?.stopPropagation?.();
    if (cartItem) dispatch(increaseQty(id));
    else dispatch(addItem(getCartPayload()));
  };

  const decrement = (e) => {
    e?.stopPropagation?.();
    if (cartItem && quantity > 0) dispatch(decreaseQty(id));
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-yellow-400/40 hover:shadow-xl"
    >
      {/* Badge */}
      <div className="absolute left-3.5 top-3.5 z-20 rounded-full border border-yellow-500/30 bg-yellow-400 px-3 py-0.5 text-xs font-bold text-black shadow-md">
        {badge}
      </div>

      <div>
        {/* Image Container */}
        <div className="relative mb-4 overflow-hidden rounded-2xl">
          <Image
            src={image || MenuPic}
            alt={name}
            width={400}
            height={250}
            className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <span className="absolute bottom-3 right-3 rounded-xl bg-green-950/90 px-3 py-1 text-sm font-bold text-yellow-400 shadow-lg backdrop-blur-md">
            Rs. {price}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-1 text-lg font-extrabold tracking-tight text-gray-900 group-hover:text-green-950">
          {name}
        </h3>

        {/* Rating */}
        <div className="mb-2.5 flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-0.5 text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-gray-800">{rating}</span>
          </div>
          <span className="text-gray-400">(200+ reviews)</span>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-500">
          {description || "Freshly prepared with handpicked ingredients."}
        </p>
      </div>

      <div>
        {/* Stepper if in cart */}
        {quantity > 0 ? (
          <div className="mb-2.5 flex items-center justify-between rounded-xl bg-green-50 p-1.5 border border-green-200">
            <button
              onClick={decrement}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-green-950 shadow-sm transition hover:bg-green-100"
              aria-label="Decrease quantity"
            >
              <Minus size={15} />
            </button>

            <span className="font-bold text-sm text-green-950">{quantity} in cart</span>

            <button
              onClick={increment}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-950 text-yellow-400 shadow-sm transition hover:bg-green-900"
              aria-label="Increase quantity"
            >
              <Plus size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={increment}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-950 py-2.5 text-xs font-bold text-yellow-400 shadow-md transition-all hover:bg-green-900 hover:shadow-lg active:scale-[0.98]"
          >
            <ShoppingCart size={15} />
            Add to Cart
          </button>
        )}

        <button
          onClick={() => router.push(`/item/${id}`)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-200 hover:bg-green-50/50 hover:text-green-950"
        >
          View Details
        </button>
      </div>
    </motion.div>
  );
};
