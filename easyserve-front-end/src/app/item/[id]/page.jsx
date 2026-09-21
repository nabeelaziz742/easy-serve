"use client";

import { useGetMenuItemDetailQuery } from "@/services/public/resturants";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { UtensilsCrossed, Package, Tag, ArrowLeft, Plus, Minus, ShoppingCart, Sparkles, Star } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addItem, increaseQty, decreaseQty } from "@/store/slices/cartSlice";
import { Skeleton } from "@/components/ui/skeleton";
import MenuPic from "@/assets/menuImgs/menu-pic.jpg";

export default function MenuItemDetail() {
  const param = useParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const dineIn = useSelector((state) => state.dineIn);
  const cartItem = useSelector((state) =>
    state.cart.items.find((i) => String(i.id) === String(param.id))
  );
  const quantity = cartItem?.qty || 0;

  const { data, isLoading } = useGetMenuItemDetailQuery(param.id, {
    skip: !param.id,
  });

  const getCartPayload = () => ({
    id: data.id,
    name: data.name,
    price: data.price,
    image: data.image,
    qty: 1,
    orderType: dineIn.active ? "DINE_IN" : "DELIVERY",
    restaurant: dineIn.active ? dineIn.restaurant?.id : null,
    table: dineIn.active ? dineIn.table : null,
  });

  const increment = () => {
    if (cartItem) dispatch(increaseQty(data.id));
    else dispatch(addItem(getCartPayload()));
  };

  const decrement = () => {
    if (cartItem && quantity > 0) dispatch(decreaseQty(data.id));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-10 w-2/3 rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-100 active:scale-[0.98]"
        >
          <ArrowLeft size={16} /> Back to Menu
        </button>

        {/* Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl"
        >
          {/* Image */}
          <div className="relative">
            <Image
              src={data.image || MenuPic}
              alt={data.name}
              width={1000}
              height={500}
              priority
              className="h-80 sm:h-96 w-full object-cover"
            />

            {/* Price Badge */}
            <span className="absolute bottom-5 right-5 rounded-2xl bg-green-950/90 px-5 py-2.5 text-xl font-extrabold text-yellow-400 shadow-2xl backdrop-blur-md">
              Rs. {data.price}
            </span>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-10 space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-800 border border-yellow-400/30">
                    <Sparkles className="h-3 w-3 text-yellow-600" /> Signature Dish
                  </span>
                  <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    4.8 (150+ reviews)
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-green-950 tracking-tight">
                  {data.name}
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                {quantity > 0 ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-2 border border-green-200">
                    <button
                      onClick={decrement}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-950 shadow-sm transition hover:bg-green-100"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-extrabold text-base text-green-950 px-2">{quantity}</span>
                    <button
                      onClick={increment}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-950 text-yellow-400 shadow-sm transition hover:bg-green-900"
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={increment}
                    className="flex items-center gap-2.5 rounded-2xl bg-green-950 px-6 py-3.5 text-sm font-bold text-yellow-400 shadow-xl transition-all hover:bg-green-900 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ShoppingCart size={18} /> Add to Cart
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-base sm:text-lg leading-relaxed text-gray-600">
              {data.description || "A delicious culinary offering prepared with the freshest ingredients."}
            </p>

            {/* Category */}
            <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
              <Tag className="h-4 w-4 text-yellow-600" />
              <span>Category: <span className="text-green-950 font-bold">{data.category || "Main Courses"}</span></span>
            </div>

            {/* Ingredients Section */}
            {data.ingredients?.length > 0 && (
              <div className="border-t border-gray-100 pt-8">
                <h2 className="text-xl font-extrabold flex items-center gap-2.5 text-green-950 mb-5">
                  <UtensilsCrossed className="h-5 w-5 text-yellow-600" /> Ingredients & Composition
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.ingredients.map((ing) => (
                    <motion.div
                      key={ing.id}
                      whileHover={{ y: -2 }}
                      className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/70 shadow-sm flex items-start gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-sm">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">
                          {ing.name}
                        </h3>
                        {ing.quantity && (
                          <p className="text-xs font-semibold text-green-700 mt-0.5">{ing.quantity}</p>
                        )}
                        {ing.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {ing.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
