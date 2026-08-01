import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "../features/user/usersSlice.js";
import connectionsReducer from "../features/connections/connectionsSlice.js";
import messagesReducer from "../features/messages/messagesSlice.js";
import sseReducer from "../features/sse/sseSlice.js";
import postsReducer from "../features/posts/postSlice.js";

export const store = configureStore({
  reducer: {
    user: usersReducer,
    connections: connectionsReducer,
    messages: messagesReducer,
    sse: sseReducer,
    posts: postsReducer,
  },
});

export default store;
