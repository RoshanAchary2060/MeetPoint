import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

const initialState = {
  value: null,
  messages: [],
  loading: false,
  error: null,
};

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async ({ token, userId }) => {
    try {
      const { data } = await api.post(
        "/api/message/get",
        { to_user_id: userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return data.success ? data : null;
    } catch (error) {
      console.error("Fetch messages error:", error);
      return null;
    }
  },
);

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload || [];
    },
    addMessages: (state, action) => {
      // Prevent duplicates
      const exists = state.messages.some(msg => msg._id === action.payload._id);
      if (!exists) {
        state.messages = [...state.messages, action.payload];
      }
    },
    resetMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.messages = action.payload.messages || [];
        }
        state.value = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setMessages, addMessages, resetMessages } =
  messagesSlice.actions;

export default messagesSlice.reducer;
