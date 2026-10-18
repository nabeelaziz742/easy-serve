"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { removeItem, increaseQty, decreaseQty, toggleCart, clearCart } from "@/store/slices/cartSlice";
import { clearDineIn } from "@/store/slices/dineInSlice";
import MenuPic from "@/assets/menuImgs/menu-pic.jpg";
import { useAddOrderMutation } from "@/services/private/orders";
import { useGetRestaurantBillingQuery } from "@/services/public/resturants";
import { getAccessToken } from "@/utilities/authStorage";
import { clearSavedDineIn, readSavedDineIn } from "@/utilities/dineInStorage";

// RTK Query errors are { status, data }; the Next.js overlay printed them as
// "{}", hiding the server's reason. Turn them into one readable sentence.
const checkoutErrorMessage = (error) => {
  const data = error?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat().find((v) => typeof v === "string");
    if (first) return first;
  }
  if (error?.status === "FETCH_ERROR") return "Cannot reach the server. Please check that the backend is running.";
  return "Checkout failed. Please try again.";
};

export default function CartDrawer() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [addOrder, { isLoading }] = useAddOrderMutation();
  const { isOpen, items, restaurant: cartRestaurantId } = useSelector((state) => state.cart);
  const dineIn = useSelector((state) => state.dineIn);

  // Same rates the server applies at checkout (manager Settings page).
  const restaurantId = (dineIn?.active && dineIn.restaurant?.id) || cartRestaurantId;
  const { data: billing } = useGetRestaurantBillingQuery(restaurantId, { skip: !restaurantId || !isOpen });
  const round = (n) => Math.round(n * 100) / 100;
  const subtotal = round(items.reduce((acc, item) => acc + item.price * item.qty, 0));
  const servicePercent = dineIn?.active ? Number(billing?.service_charge_percent) || 0 : 0;
  const taxPercent = Number(billing?.tax_percent) || 0;
  const serviceCharge = round((subtotal * servicePercent) / 100);
  const tax = round((subtotal * taxPercent) / 100);
  const total = round(subtotal + serviceCharge + tax);
  const fmt = (n) => n.toFixed(2);

  const authToken = useSelector((state) => state.auth?.token);

  // Dine-in guests order with their table session, no account needed.
  // A delivery order needs a customer account: send a signed-out visitor
  // to log in and bring them back here with the cart in place.
  const sendToLogin = () => {
    toast.info("Please log in to place your order. Your cart is saved.");
    dispatch(toggleCart());
    const here = `${window.location.pathname}${window.location.search}`;
    router.push(`/auth/login?next=${encodeURIComponent(here)}`);
  };

  const handleCheckout = async () => {
    // The table session also lives in localStorage, so a guest whose page
    // was reloaded or opened without "?mode=dine-in" still orders as the
    // table's guest instead of being sent to log in.
    const saved = readSavedDineIn();
    const seated = dineIn?.active
      ? dineIn
      : saved?.active && saved?.sessionToken
        ? saved
        : null;

    if (!seated && !authToken && !getAccessToken()) {
      sendToLogin();
      return;
    }

    let body;

    if (seated) {
      body = {
        order_type: "DINE_IN",
        restaurant: seated.restaurant?.id,
        table: seated.table?.number ?? seated.table,
        guests: Number(seated.guests) || 1,
        name: seated.name || "",
        phone: seated.phone || "",
        session_token: seated.sessionToken || seated.session?.token || "",
        items: items.map((i) => ({
          menu_item: i.id,
          quantity: i.qty,
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
          quantity: i.qty,
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
      if (error?.status === 401 && !seated) {
        sendToLogin();
        return;
      }

      const message = checkoutErrorMessage(error);
      // Handled and shown to the customer, so a warning rather than an
      // error that opens the Next.js dev overlay.
      console.warn(`Checkout failed (${error?.status ?? "unknown"}): ${message}`);
      toast.error(message);

      // The table's session was closed after the bill was settled, so the
      // saved token can never work again. Forget it and reopen the table's
      // QR link, which starts a fresh session (guest count, then menu) and
      // keeps the cart.
      if (error?.data?.code === "dine_in_session_ended") {
        const restaurantId = seated?.restaurant?.id;
        const tableNumber = seated?.table?.number ?? seated?.table;
        dispatch(clearDineIn());
        clearSavedDineIn();
        dispatch(toggleCart());
        if (restaurantId && tableNumber) {
          router.push(`/restaurant/${restaurantId}?mode=dine-in&table=${tableNumber}`);
        }
      }
    }
  };


  return (
    <>
      {isOpen && (
        <div onClick={() => dispatch(toggleCart())} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
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
          <button onClick={() => dispatch(toggleCart())} className="rounded-full p-2 transition hover:bg-white/10">
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
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
                <div className="flex gap-4">
                  <Image src={item.image || MenuPic} alt="Food" width={90} height={90} className="h-24 w-24 rounded-2xl object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <p className="mt-1 text-sm text-gray-500">Rs. {item.price}</p>
                      </div>
                      <button onClick={() => dispatch(removeItem(item.id))} className="text-red-500 transition hover:scale-110">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-full bg-gray-100 px-3 py-2">
                        <button onClick={() => dispatch(decreaseQty(item.id))} className="rounded-full bg-white p-1 shadow">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-semibold">{item.qty}</span>
                        <button onClick={() => dispatch(increaseQty(item.id))} className="rounded-full bg-white p-1 shadow">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="font-bold text-green-900">Rs. {item.price * item.qty}</p>
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
                  🍽️ Dine-In Order · Table #{dineIn.table?.number ?? dineIn.table}
                </div>
              ) : (
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">🚚 Delivery Order</div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">Rs. {fmt(subtotal)}</span></div>
              {servicePercent > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Service charge {servicePercent}%</span><span className="font-medium">Rs. {fmt(serviceCharge)}</span></div>
              )}
              {taxPercent > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">{billing?.tax_label || "Tax"} {taxPercent}%</span><span className="font-medium">Rs. {fmt(tax)}</span></div>
              )}
              {!restaurantId && <p className="text-xs text-gray-400">Taxes, if any, are added on your bill.</p>}
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <span className="text-lg font-bold">Grand Total</span>
              <span className="text-2xl font-extrabold text-green-900">Rs. {fmt(total)}</span>
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
