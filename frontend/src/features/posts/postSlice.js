import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

export const fetchPosts = createAsyncThunk(
  "posts/fetchPosts",
  async (token) => {
    const { data } = await api.get("/api/post/feed", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data.posts;
  },
);

const postsSlice = createSlice({
  name: "posts",

  initialState: {
    posts: [],
    loading: false,
  },

  reducers: {
    addPost: (state, action) => {
      state.posts.unshift(action.payload);
    },

    removePost: (state, action) => {
      state.posts = state.posts.filter(
        (post) => post._id !== action.payload,
      );
    },

    updatePost: (state, action) => {
      const index = state.posts.findIndex(
        (p) => p._id === action.payload._id,
      );

      if (index !== -1) {
        state.posts[index] = action.payload;
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
      })

      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })

      .addCase(fetchPosts.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {
  addPost,
  removePost,
  updatePost,
} = postsSlice.actions;

export default postsSlice.reducer;
