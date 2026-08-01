import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import api from "../api/axios";
import PostCard from "../components/PostCard.jsx";

const Post = () => {
  console.log("Post component rendered");
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);





  const fetchPost = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/post/${postId}`);
      console.log('single post data in postcomponent', data)
      if (data.success) {
        setPost(data.post);
      } else {
        setPost(null);
      }
    } catch (err) {
      console.error("Error fetching single post:", err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (post?.user?.full_name) {
      document.title = `${post.user.full_name} • MeetPoint`;
    } else {
      document.title = "MeetPoint";
    }

    return () => {
      document.title = "MeetPoint";
    };
  }, [post]);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800">Post not found</h2>

          <p className="text-gray-500 mt-3">
            This post may have been deleted or the link is invalid.
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium w-full"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b shadow-sm z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div
            className="cursor-pointer"
            onClick={() => navigate("/")}
          >
            <h1 className="text-3xl font-bold text-indigo-600">
              MeetPoint
            </h1>
            <p className="text-sm text-gray-500">
              Connect • Share • Discover
            </p>
          </div>

          {!user && (
            <button
              onClick={() => navigate("/")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition font-medium"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      {/* Main Post Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <PostCard post={post} />
      </main>

      {/* Guest CTA Card */}
      {!user && (
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <div className="bg-white rounded-2xl shadow p-8 text-center border">
            <h2 className="text-2xl font-bold text-gray-800">
              Join the conversation
            </h2>

            <p className="text-gray-500 mt-3 max-w-md mx-auto">
              Sign in to like posts, comment, chat, make connections,
              and enjoy everything MeetPoint has to offer.
            </p>

            <button
              onClick={() => navigate("/")}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg transition font-semibold"
            >
              Log In to MeetPoint
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
