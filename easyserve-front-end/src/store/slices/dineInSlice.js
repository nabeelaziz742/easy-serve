import { createSlice } from "@reduxjs/toolkit";


const initialState = {
  active: false,
  restaurant: null,
  table: null,
  menus: [],
  active_session: null,
  guests: null,
  name: "",
  phone: "",
  sessionToken: null
};

const dineInSlice = createSlice({
  name: "dineIn",
  initialState,
  reducers: {
    setDineInContext(state, action) {
      return {
        ...state,
        ...action.payload,
        active: true,
      };
    },

    setDineInGuests(state, action) {
      state.guests = action.payload;
    },

    setGuestInfo: (state, action) => {
      state.guest_name = action.payload.name;
      state.guest_phone = action.payload.phone;
    },

    clearDineIn(state) {
      return state.initialState;
    },
  },
});

export const {
  setDineInContext,
  setDineInGuests,
  setGuestInfo,
  clearDineIn,
} = dineInSlice.actions;

export default dineInSlice.reducer;
