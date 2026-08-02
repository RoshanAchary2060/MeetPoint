import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth, useUser } from "@clerk/clerk-react";

import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";
import PostCard from "../components/PostCard";
import RecentMessages from "../components/RecentMessages";

import { clearSSEEvent } from "../features/sse/sseSlice.js";
import { fetchPosts, removePost, addPost } from "../features/posts/postSlice";
import socket from "../socket/socket.js";

const Feed = () => {
  const { user } = useUser();
  const dispatch = useDispatch();
  const { getToken } = useAuth();

  // Select state from Redux store
  const feeds = useSelector((state) => state.posts.posts);
  const loading = useSelector((state) => state.posts.loading);
  const sseEvent = useSelector((state) => state.sse.event);

  // 1. Fetch initial posts into Redux on mount
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

  // 2. Real-time updates via Socket.io
  useEffect(() => {
    const handleNewPost = (newPost) => {
      // 🟢 Dispatch directly to Redux store
      dispatch(addPost(newPost));
    };

    const handleDeletedPost = (data) => {
      dispatch(removePost(data.postId || data._id));
    };

    socket.on("POST_CREATED", handleNewPost);
    socket.on("POST_DELETED", handleDeletedPost);

    return () => {
      socket.off("POST_CREATED", handleNewPost);
      socket.off("POST_DELETED", handleDeletedPost);
    };
  }, [dispatch]);

  // 3. Optional SSE listener fallback (if sseSlice is active)
  useEffect(() => {
    if (!sseEvent) return;

    switch (sseEvent.type) {
      case "POST_CREATED":
        dispatch(addPost(sseEvent.data));
        break;

      case "POST_DELETED":
        dispatch(removePost(sseEvent.data.postId));
        break;

      default:
        break;
    }

    dispatch(clearSSEEvent());
  }, [sseEvent, dispatch]);

  if (loading && feeds.length === 0) {
    return <Loading />;
  }

  return (
    <div
      className="h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex
    items-start justify-center xl:gap-8"
    >
      {/* Stories and post list */}
      <div className="w-full max-w-2xl">
        <StoriesBar />
        <div className="p-4 space-y-6 w-full">
          {feeds.length > 0 ? (
            feeds.map((post) => <PostCard key={post._id} post={post} />)
          ) : (
            <p className="text-center text-gray-500 py-10">
              No posts available yet.
            </p>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="max-xl:hidden sticky top-0">
        <div
          className="max-w-xs bg-white text-xs p-4 rounded-md inline-flex
        flex-col gap-2 shadow"
        >
          <h3 className="text-slate-800 font-semibold">Sponsored</h3>
          <img
            className="w-75 h-50 rounded-md object-cover"
            src={assets.sponsored_img}
            alt="Sponsored advertisement"
          />
          <p className="text-slate-600 font-medium">Email marketing</p>
          <p className="text-slate-400">
            Supercharge your marketing with a powerful, easy-to-use platform
            built for results.
          </p>
        </div>
        <RecentMessages />
      </div>
    </div>
  );
};

export default Feed;
