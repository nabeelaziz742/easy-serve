import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  active: false,
  restaurant: null,
  table: null,
  menus: [],
  active_session: false,
  session: null,
  guests: null,
  name: "",
  phone: "",
  sessionToken: null,
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
        name: action.payload.name ?? state.name ?? "",
        phone: action.payload.phone ?? state.phone ?? "",
      };
    },

    setDineInGuests(state, action) {
      state.guests = action.payload;
    },

    setGuestInfo(state, action) {
      state.name = action.payload.name ?? "";
      state.phone = action.payload.phone ?? "";
    },

    setDineInSession(state, action) {
      state.active_session = action.payload.active_session ?? true;
      state.session = action.payload.session ?? state.session;
      state.sessionToken =
        action.payload.sessionToken ??
        action.payload.session?.token ??
        state.sessionToken;
      if (action.payload.session?.guests != null) {
        state.guests = action.payload.session.guests;
      }
      state.name = action.payload.session?.name ?? state.name;
      state.phone = action.payload.session?.phone ?? state.phone;
    },

    clearDineIn() {
      return initialState;
    },
  },
});

export const {
  setDineInContext,
  setDineInGuests,
  setGuestInfo,
  setDineInSession,
  clearDineIn,
} = dineInSlice.actions;

export default dineInSlice.reducer;
