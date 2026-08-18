"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
} from "lucide-react";

import Image from "next/image";

import { useSelector, useDispatch } from "react-redux";

import {
  removeItem,
  increaseQty,
  decreaseQty,
  toggleCart,
  clearCart,
} from "@/store/slices/cartSlice";

import MenuPic from "@/assets/menuImgs/menu-pic.jpg";

import { useAddOrderMutation } from "@/services/private/orders";

export default function CartDrawer() {
  const dispatch = useDispatch();
  const router = useRouter();

  const [addOrder, { isLoading }] = useAddOrderMutation();

  const { isOpen, items } = useSelector((state) => state.cart);
  const dineIn = useSelector((state) => state.dineIn);

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );

  const discount = subtotal * 0.15;
  const tax = subtotal * 0.15;
  const deliveryFee = dineIn?.active ? 0 : 120;
  const total = subtotal + tax + deliveryFee - discount;

  const handleCheckout = async () => {
    let body;

    if (dineIn?.active) {
      body = {
        order_type: "DINE_IN",
        restaurant: dineIn.restaurant.id,
        table: dineIn.table.number,
        guests: Number(dineIn.guests || 1),
        name: dineIn.name || "",
        phone: dineIn.phone || "",
        session_token: dineIn.sessionToken || dineIn.session?.token || null,
        items: items.map((i) => ({
          menu_item: i.id,
          quantity: Number(i.qty || 1),
          comments: i.comment || "",
        })),
      };
    } else {
      body = {
        order_type: "DELIVERY",
        billing_address: "House 10, Street 5",
        shipping_address: "House 10, Street 5",
        items: items.map((i) => ({
          menu_item: i.id,
          quantity: Number(i.qty || 1),
          comments: i.comment || "",
        })),
      };
    }

    try {
      const res = await addOrder(body).unwrap();

      dispatch(clearCart());
      dispatch(toggleCart());
      console.log("Order created:", res);
      router.push("/orders");
    } catch (error) {
      console.error("Checkout failed:", {
        status: error?.status,
        data: error?.data,
        error: error?.error,
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={() => dispatch(toggleCart())}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? 0 : "100%" }}
        transition={{ type: "tween", duration: 0.35 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:w-[430px]"
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-green-950 px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 text-black">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Your Cart</h2>
              <p className="text-xs text-green-200">{items.length} items added</p>
            </div>
          </div>

          <button
            onClick={() => dispatch(toggleCart())}
            className="rounded-full p-2 transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
                <ShoppingBag className="h-10 w-10 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Your cart is empty</h3>
              <p className="mt-2 text-sm text-gray-500">Add delicious meals to continue</p>
            </div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  <Image
                    src={item.image || MenuPic}
                    alt="Food"
                    width={90}
                    height={90}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <p className="mt-1 text-sm text-gray-500">Rs. {item.price}</p>
                      </div>

                      <button
                        onClick={() => dispatch(removeItem(item.id))}
                        className="text-red-500 transition hover:scale-110"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-full bg-gray-100 px-3 py-2">
                        <button
                          onClick={() => dispatch(decreaseQty(item.id))}
                          className="rounded-full bg-white p-1 shadow"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <span className="font-semibold">{item.qty}</span>

                        <button
                          onClick={() => dispatch(increaseQty(item.id))}
                          className="rounded-full bg-white p-1 shadow"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="font-bold text-green-900">
                        Rs. {item.price * item.qty}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {items.length !== 0 && (
          <div className="border-t border-gray-200 bg-white p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="mb-5">
              {dineIn.active ? (
                <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  🍽️ Dine-In Order · Table #{dineIn.table.number}
                </div>
              ) : (
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  🚚 Delivery Order
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">Rs. {subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Tax 15%</span>
                <span className="font-medium">Rs. {tax}</span>
              </div>

              {!dineIn.active && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-medium">Rs. {deliveryFee}</span>
                </div>
              )}

              <div className="flex justify-between text-green-600">
                <span>Discount 15%</span>
                <span>- Rs. {discount}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <span className="text-lg font-bold">Grand Total</span>
              <span className="text-2xl font-extrabold text-green-900">Rs. {total}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || isLoading}
              className="mt-5 w-full rounded-2xl bg-green-900 py-4 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Processing..." : "Proceed to Checkout"}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
