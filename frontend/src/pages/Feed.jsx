import { useEffect, useState } from "react";
import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";
import PostCard from "../components/PostCard";
import RecentMessages from "../components/RecentMessages";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { clearSSEEvent } from "../features/sse/sseSlice.js";
import { useUser } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import { fetchPosts, removePost, addPost } from "../features/posts/postSlice";

const Feed = () => {
  const { user } = useUser();
  const dispatch = useDispatch();

  const feeds = useSelector((state) => state.posts.posts);
  const loading = useSelector((state) => state.posts.loading);
  const sseEvent = useSelector((state) => state.sse.event);
  const { getToken } = useAuth();

  useEffect(() => {
    const loadPosts = async () => {
      dispatch(fetchPosts(await getToken()));
    };

    loadPosts();
  }, []);

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
  }, [sseEvent]);

  return !loading ? (
    <div
      className="h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex
    items-start justify-center xl:gap-8"
    >
      {/* Stories and post list */}
      <div className="w-full max-w-2xl">
        <StoriesBar />
        <div className="p-4 space-y-6 w-full">
          {feeds.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
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
            className="w-75 h-50 rounded-md"
            src={assets.sponsored_img}
            alt=""
          />
          <p className="text-slate-600">Email marketing</p>
          <p className="text-slate-400">
            Supercharge your marketing with a powerful, easy-to-use platform
            built for results.
          </p>
        </div>
        <RecentMessages />
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Feed;
