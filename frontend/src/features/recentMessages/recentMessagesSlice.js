import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
};

const getUserId = (user) => {
  if (!user) return null;

  return typeof user === "object" ? user._id : user;
};

const getConversationUserId = (message, currentUserId) => {
  const fromId = getUserId(message.from_user_id);
  const toId = getUserId(message.to_user_id);

  return fromId === currentUserId ? toId : fromId;
};

const recentMessagesSlice = createSlice({
  name: "recentMessages",

  initialState,

  reducers: {
    // ============================================================
    // SET RECENT MESSAGES
    // ============================================================

    setRecentMessages: (state, action) => {
      state.messages = action.payload;
    },

    // ============================================================
    // ADD / UPDATE RECENT MESSAGE
    // ============================================================

    addRecentMessage: (state, action) => {
      const { message, incrementUnread = false } = action.payload || {};

      if (!message?._id) {
        return;
      }

      const fromId = getUserId(message.from_user_id);
      const toId = getUserId(message.to_user_id);

      // Find the existing conversation
      const existingIndex = state.messages.findIndex((existing) => {
        const existingFrom = getUserId(existing.from_user_id);
        const existingTo = getUserId(existing.to_user_id);

        return (
          (existingFrom === fromId && existingTo === toId) ||
          (existingFrom === toId && existingTo === fromId)
        );
      });

      // ==========================================================
      // NEW CONVERSATION
      // ==========================================================

      if (existingIndex === -1) {
        state.messages.unshift({
          ...message,
          unreadCount: incrementUnread ? 1 : 0,
        });

        return;
      }

      // ==========================================================
      // EXISTING CONVERSATION
      // ==========================================================

      const existingMessage = state.messages[existingIndex];

      const currentUnreadCount = existingMessage.unreadCount || 0;

      const newUnreadCount = incrementUnread
        ? currentUnreadCount + 1
        : currentUnreadCount;

      // Remove old conversation row
      state.messages.splice(existingIndex, 1);

      // Add latest message at top
      state.messages.unshift({
        ...message,
        unreadCount: newUnreadCount,
      });
    },

    // ============================================================
    // MARK ONE CONVERSATION AS READ
    // ============================================================

    markConversationRead: (state, action) => {
      const userId = action.payload;

      state.messages = state.messages.map((message) => {
        const fromId = getUserId(message.from_user_id);
        const toId = getUserId(message.to_user_id);

        const conversationUserId = fromId === userId ? toId : fromId;

        if (conversationUserId === userId) {
          return {
            ...message,
            unreadCount: 0,
            seen: true,
          };
        }

        return message;
      });
    },

    // ============================================================
    // CLEAR ALL
    // ============================================================

    clearRecentMessages: (state) => {
      state.messages = [];
    },
  },
});

export const {
  setRecentMessages,
  addRecentMessage,
  markConversationRead,
  clearRecentMessages,
} = recentMessagesSlice.actions;

export default recentMessagesSlice.reducer;
