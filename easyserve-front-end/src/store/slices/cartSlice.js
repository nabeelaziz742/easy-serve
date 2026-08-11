import { createSlice } from "@reduxjs/toolkit";


const initialState = {
  isOpen: false,
  items: [],
  orderType: null,     // "DELIVERY" | "DINE_IN"
  restaurant: null,
  table: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },

    addItem: (state, action) => {
      const {
        id,
        qty,
        orderType,
        restaurant,
        table,
      } = action.payload;

      // 🛑 First item → lock cart context
      if (state.items.length === 0) {
        state.orderType = orderType || "DELIVERY";
        state.restaurant = restaurant || null;
        state.table = table || null;
      }

      // 🛑 Prevent mixing DELIVERY + DINE_IN
      if (state.orderType !== orderType) {
        console.log(state.orderType);
        console.log(orderType);
        alert("You cannot mix dine-in and DELIVERY orders.");
        return;
      }

      // 🛑 Prevent cross-restaurant mixing
      if (state.restaurant && restaurant && state.restaurant !== restaurant) {
        alert("You can only order from one restaurant at a time.");
        return;
      }

      // 🛑 Prevent wrong table
      if (state.orderType === "DINE_IN" && state.table !== table) {
        // alert("This cart is locked to another table.");
        // return;
      }

      const existing = state.items.find((i) => i.id === id);
      if (existing) {
        existing.qty += qty;
      } else {
        state.items.push(action.payload);
      }
    },

    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload);

      // Reset cart if empty
      if (state.items.length === 0) {
        state.orderType = null;
        state.restaurant = null;
        state.table = null;
      }
    },

    increaseQty: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) item.qty += 1;
    },

    decreaseQty: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (!item) return;

      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        state.items = state.items.filter((i) => i.id !== action.payload);
      }

      // Reset context if empty
      if (state.items.length === 0) {
        state.orderType = null;
        state.restaurant = null;
        state.table = null;
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.orderType = null;
      state.restaurant = null;
      state.table = null;
    },
  },
});

export const {
  toggleCart,
  addItem,
  removeItem,
  increaseQty,
  decreaseQty,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
