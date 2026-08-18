"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"

import { getRestaurant } from "@/services/public/restaurants"
import { createOrder } from "@/services/private/orders"

function RestaurantContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const restaurantId = params?.id
  const mode = searchParams.get("mode") || ""
  const table = searchParams.get("table") || ""
  const sessionToken = searchParams.get("session_token") || ""

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cart, setCart] = useState([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadRestaurant() {
      if (!restaurantId) return
      setLoading(true)
      setError("")
      try {
        const data = await getRestaurant(restaurantId)
        if (!cancelled) setRestaurant(data)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || "Failed to load restaurant.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadRestaurant()
    return () => { cancelled = true }
  }, [restaurantId])

  async function handleCheckout() {
    if (checkoutLoading) return
    if (!cart.length) {
      setError("Please add at least one item before proceeding.")
      return
    }
    if (mode === "dine-in" && (!table || !sessionToken)) {
      setError("This dine-in session is no longer valid. Please scan the table QR code again.")
      return
    }
    setCheckoutLoading(true)
    setError("")
    try {
      const payload = {
        restaurant: Number(restaurantId),
        order_type: mode === "dine-in" ? "DINE_IN" : "DELIVERY",
        items: cart.map((item) => ({
          menu_item: Number(item.menu_item ?? item.id),
          quantity: Number(item.quantity || 1),
        })),
      }
      if (mode === "dine-in") {
        payload.table = Number(table)
        payload.session_token = sessionToken
        payload.guests = 1
      }
      const order = await createOrder(payload)
      const orderId = order?.id ?? order?.order_id
      if (!orderId) throw new Error("Order was created but no order ID was returned.")
      router.push(`/orders/${orderId}`)
    } catch (err) {
      const data = err?.response?.data
      setError(data?.detail || data?.message || (typeof data === "string" ? data : "Checkout failed. Please try again."))
      console.error("Checkout failed:", data || err)
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center">Loading restaurant...</div>
  if (!restaurant) return <div className="flex min-h-[70vh] items-center justify-center">{error || "Restaurant not found."}</div>
  return (
    <div className="min-h-[70vh]">
      {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <button type="button" disabled={checkoutLoading} onClick={handleCheckout} className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {checkoutLoading ? "Processing..." : "Proceed to Checkout"}
      </button>
    </div>
  )
}

export default function RestaurantPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center">Loading...</div>}>
      <RestaurantContent />
    </Suspense>
  )
}
