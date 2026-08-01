import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  event: null,
};

const sseSlice = createSlice({
  name: "sse",
  initialState,
  reducers: {
    setSSEEvent: (state, action) => {
      state.event = action.payload;
    },

    clearSSEEvent: (state) => {
      state.event = null;
    },
  },
});

export const { setSSEEvent, clearSSEEvent } = sseSlice.actions;

export default sseSlice.reducer;
