import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth, useUser } from "@clerk/clerk-react";

import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";
import PostCard from "../components/PostCard";
import RecentMessages from "../components/RecentMessages";

import { clearSSEEvent } from "../features/sse/sseSlice.js";
import {
  fetchPosts,
  removePost,
  addPost,
  updatePost,
} from "../features/posts/postSlice";

import socket from "../socket/socket.js";
import MeetPointAI from "../components/MeetPointAI.jsx";
import MeetPointAICard from "../components/MeetPointAICard.jsx";

const Feed = () => {
  const { user } = useUser();
  const dispatch = useDispatch();
  const { getToken } = useAuth();

  // Select state from Redux store
  const feeds = useSelector((state) => state.posts.posts);
  const loading = useSelector((state) => state.posts.loading);
  const sseEvent = useSelector((state) => state.sse.event);

  // ============================================================
  // FETCH INITIAL POSTS
  // ============================================================

  useEffect(() => {
    const loadInitialPosts = async () => {
      try {
        const token = await getToken();

        if (token) {
          dispatch(fetchPosts(token));
        }
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };

    loadInitialPosts();
  }, [dispatch, getToken]);

  const handleLikedPost = (updatedPost) => {
    dispatch(updatePost(updatedPost));
  };

  // ============================================================
  // REAL-TIME UPDATES VIA SOCKET.IO
  // ============================================================

  useEffect(() => {
    const handleNewPost = (newPost) => {
      dispatch(addPost(newPost));
    };

    const handleDeletedPost = (data) => {
      dispatch(removePost(data.postId || data._id));
    };

    socket.on("POST_CREATED", handleNewPost);
    socket.on("POST_DELETED", handleDeletedPost);
    socket.on("POST_LIKED", handleLikedPost);

    return () => {
      socket.off("POST_CREATED", handleNewPost);
      socket.off("POST_DELETED", handleDeletedPost);
      socket.off("POST_LIKED", handleLikedPost);
    };
  }, [dispatch]);

  // ============================================================
  // SSE FALLBACK
  // ============================================================

  useEffect(() => {
    if (!sseEvent) return;

    switch (sseEvent.type) {
      case "POST_CREATED":
        dispatch(addPost(sseEvent.data));
        break;

      case "POST_DELETED":
        dispatch(removePost(sseEvent.data.postId));
        break;

      case "POST_LIKED":
        dispatch(addPost(sseEvent.data));
        break;

      default:
        break;
    }

    dispatch(clearSSEEvent());
  }, [sseEvent, dispatch]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading && feeds.length === 0) {
    return <Loading />;
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="
        h-full
        overflow-y-scroll
        no-scrollbar
        py-10
        xl:pr-5
        flex
        items-start
        justify-center
        xl:gap-8
        bg-slate-50
        dark:bg-slate-950
        transition-colors
        duration-300
      "
    >
      {/* ======================================================
          STORIES + POSTS
      ====================================================== */}

      <div className="w-full max-w-2xl">
        <StoriesBar />

        <div className="p-4 space-y-6 w-full">
          {feeds.length > 0 ? (
            feeds.map((post) => (
              <PostCard
                key={post._id}
                post={post}
              />
            ))
          ) : (
            <p
              className="
                text-center
                text-gray-500
                dark:text-slate-400
                py-10
              "
            >
              No posts available yet.
            </p>
          )}
        </div>
      </div>

      {/* ======================================================
          RIGHT SIDEBAR
      ====================================================== */}

      <div className="max-xl:hidden sticky top-0">
        {/* ====================================================
            MEETPOINT AI
        ==================================================== */}

        <MeetPointAICard />

        {/* RECENT MESSAGES */}

        <RecentMessages />
      </div>
    </div>
  );
};

export default Feed;
