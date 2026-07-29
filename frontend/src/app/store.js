import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "../features/user/usersSlice.js";
import connectionsReducer from "../features/connections/connectionsSlice.js";
import messagesReducer from "../features/messages/messagesSlice.js";

export const store = configureStore({
  reducer: {
    user: usersReducer,
    connections: connectionsReducer,
    messages: messagesReducer,
  },
});

export default store;
