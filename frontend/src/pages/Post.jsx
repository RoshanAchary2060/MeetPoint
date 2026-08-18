import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { ArrowLeft, LogIn, UserPlus, Sun, Moon } from "lucide-react";

import api from "../api/axios";
import PostCard from "../components/PostCard.jsx";
import { useTheme } from "../context/ThemeContext";
import { assets } from "../assets/assets.js";

const Post = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const { user, isLoaded } = useUser();

  const { darkMode, toggleDarkMode } = useTheme();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // REDUX POST
  // ============================================================

  const reduxPost = useSelector((state) =>
    state.posts.posts.find((item) => item._id === postId),
  );

  // ============================================================
  // FETCH SINGLE POST
  // ============================================================

  const fetchPost = async () => {
    try {
      setLoading(true);

      const { data } = await api.get(`/api/post/single/${postId}`);

      console.log("📌 Single post data in Post component:", data);

      if (data.success) {
        setPost(data.post);
      } else {
        setPost(null);
      }
    } catch (error) {
      console.error("❌ Error fetching single post:", error);

      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH WHEN POST ID CHANGES
  // ============================================================

  useEffect(() => {
    fetchPost();
  }, [postId]);

  // ============================================================
  // SYNC WITH REDUX
  // ============================================================
  //
  // App.jsx
  //     ↓
  // post-liked socket event
  //     ↓
  // updatePost(updatedPost)
  //     ↓
  // Redux posts
  //     ↓
  // reduxPost changes
  //     ↓
  // shared Post page updates
  //
  // ============================================================

  useEffect(() => {
    if (!reduxPost) return;

    console.log("🔄 Shared post updated from Redux:", reduxPost);

    setPost(reduxPost);
  }, [reduxPost]);

  // ============================================================
  // DOCUMENT TITLE
  // ============================================================

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

  // ============================================================
  // LOADING
  // ============================================================

  if (loading || !isLoaded) {
    return (
      <div
        className="
          min-h-screen
          bg-gray-50
          dark:bg-slate-950
          flex
          items-center
          justify-center
          px-4
          transition-colors
          duration-300
        "
      >
        <div className="text-center">
          <div
            className="
              w-10
              h-10
              border-4
              border-indigo-600
              border-t-transparent
              rounded-full
              animate-spin
              mx-auto
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-gray-500
              dark:text-slate-400
            "
          >
            Loading post...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // POST NOT FOUND
  // ============================================================

  if (!post) {
    return (
      <div
        className="
          min-h-screen
          bg-gray-50
          dark:bg-slate-950
          flex
          items-center
          justify-center
          px-4
          transition-colors
          duration-300
        "
      >
        <div
          className="
            w-full
            max-w-md
            bg-white
            dark:bg-slate-900
            border
            border-gray-200
            dark:border-slate-800
            rounded-2xl
            shadow-sm
            p-8
            text-center
          "
        >
          <div
            className="
              w-16
              h-16
              mx-auto
              rounded-full
              bg-indigo-50
              dark:bg-indigo-500/10
              flex
              items-center
              justify-center
            "
          >
            <span className="text-2xl">📭</span>
          </div>

          <h2
            className="
              mt-5
              text-xl
              font-semibold
              text-gray-900
              dark:text-white
            "
          >
            Post not found
          </h2>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-gray-500
              dark:text-slate-400
            "
          >
            This post may have been deleted or the shared link might be invalid.
          </p>

          <button
            onClick={() => navigate("/")}
            className="
              mt-6
              w-full
              inline-flex
              items-center
              justify-center
              gap-2
              px-5
              py-2.5
              rounded-xl
              bg-indigo-600
              hover:bg-indigo-700
              text-white
              text-sm
              font-medium
              transition
            "
          >
            <ArrowLeft className="w-4 h-4" />
            Go to MeetPoint
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div
      className="
        min-h-screen
        bg-gray-50
        dark:bg-slate-950
        transition-colors
        duration-300
      "
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header
        className="
          sticky
          top-0
          z-40
          bg-white/90
          dark:bg-slate-950/90
          backdrop-blur-md
          border-b
          border-gray-200
          dark:border-slate-800
          transition-colors
          duration-300
        "
      >
        <div
          className="
            max-w-4xl
            mx-auto
            px-4
            sm:px-6
            h-16
            flex
            items-center
            justify-between
          "
        >
          {/* ==================================================
              LOGO
          ================================================== */}

          <button
            // onClick={() => navigate("/")}
            className="
              flex
              items-center
              gap-2
              cursor-pointer
              shrink-0
            "
          >
            <div
              className="
                w-10
                h-10
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <img
                src={assets.logo}
                alt="MeetPoint"
                className="
                  w-9
                  h-9
                  object-contain
                "
              />
            </div>

            <span
              className="
                text-xl
                font-bold
                text-gray-900
                dark:text-white
                transition-colors
              "
            >
              MeetPoint
            </span>
          </button>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <div className="flex items-center gap-2">
            {/* =================================================
                THEME TOGGLE
            ================================================= */}

            <button
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="
                w-10
                h-10
                rounded-xl
                flex
                items-center
                justify-center
                bg-gray-100
                dark:bg-slate-800
                text-gray-600
                dark:text-yellow-400
                hover:bg-gray-200
                dark:hover:bg-slate-700
                border
                border-gray-200
                dark:border-slate-700
                transition
                active:scale-90
              "
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* =================================================
                LOGIN / BACK
            ================================================= */}

            {!user ? (
              <button
                onClick={() => navigate("/")}
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-xl
                  bg-indigo-600
                  hover:bg-indigo-700
                  text-white
                  text-sm
                  font-medium
                  transition
                "
              >
                <LogIn className="w-4 h-4" />
                Log in
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-xl
                  border
                  border-gray-200
                  dark:border-slate-700
                  text-gray-700
                  dark:text-slate-200
                  hover:bg-gray-100
                  dark:hover:bg-slate-800
                  text-sm
                  font-medium
                  transition
                "
              >
                <ArrowLeft className="w-4 h-4" />
                Back to MeetPoint
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main
        className="
          max-w-4xl
          mx-auto
          px-4
          sm:px-6
          py-8
          sm:py-10
        "
      >
        {/* ====================================================
            SHARED POST LABEL
        ==================================================== */}

        <div
          className="
            max-w-2xl
            mx-auto
            mb-5
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              text-sm
              text-gray-500
              dark:text-slate-400
            "
          >
            <span
              className="
                w-2
                h-2
                rounded-full
                bg-indigo-600
              "
            />

            <span>Shared post</span>
          </div>
        </div>

        {/* ====================================================
            POST
        ==================================================== */}

        <div className="max-w-2xl mx-auto">
          <PostCard post={post} />
        </div>

        {/* ====================================================
            GUEST CTA
        ==================================================== */}

        {!user && (
          <div
            className="
              max-w-2xl
              mx-auto
              mt-6
            "
          >
            <div
              className="
                relative
                overflow-hidden
                bg-white
                dark:bg-slate-900
                border
                border-gray-200
                dark:border-slate-800
                rounded-2xl
                shadow-sm
                px-6
                py-7
                sm:px-8
                text-center
                transition-colors
                duration-300
              "
            >
              {/* Decorative background */}

              <div
                className="
                  absolute
                  -top-16
                  -right-16
                  w-32
                  h-32
                  rounded-full
                  bg-indigo-100
                  dark:bg-indigo-500/10
                  blur-2xl
                "
              />

              <div
                className="
                  absolute
                  -bottom-16
                  -left-16
                  w-32
                  h-32
                  rounded-full
                  bg-indigo-100
                  dark:bg-indigo-500/10
                  blur-2xl
                "
              />

              {/* =================================================
                  ICON
              ================================================= */}

              <div
                className="
                  relative
                  w-12
                  h-12
                  mx-auto
                  rounded-full
                  bg-indigo-50
                  dark:bg-indigo-500/10
                  flex
                  items-center
                  justify-center
                "
              >
                <UserPlus
                  className="
                    w-5
                    h-5
                    text-indigo-600
                    dark:text-indigo-400
                  "
                />
              </div>

              {/* =================================================
                  TITLE
              ================================================= */}

              <h2
                className="
                  relative
                  mt-4
                  text-lg
                  sm:text-xl
                  font-semibold
                  text-gray-900
                  dark:text-white
                "
              >
                Join MeetPoint
              </h2>

              {/* =================================================
                  DESCRIPTION
              ================================================= */}

              <p
                className="
                  relative
                  mt-2
                  max-w-md
                  mx-auto
                  text-sm
                  leading-6
                  text-gray-500
                  dark:text-slate-400
                "
              >
                Create an account to like posts, comment, connect with people,
                and share your own moments.
              </p>

              {/* =================================================
                  LOGIN
              ================================================= */}

              <button
                onClick={() => navigate("/")}
                className="
                  relative
                  mt-5
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  px-6
                  py-2.5
                  rounded-xl
                  bg-indigo-600
                  hover:bg-indigo-700
                  text-white
                  text-sm
                  font-medium
                  shadow-sm
                  transition
                "
              >
                <LogIn className="w-4 h-4" />
                Log in to MeetPoint
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="text-center mt-10">
          <button
            onClick={() => navigate("/")}
            className="
              text-sm
              text-gray-400
              dark:text-slate-500
              hover:text-indigo-600
              dark:hover:text-indigo-400
              transition
            "
          >
            MeetPoint • Connect • Share • Discover
          </button>
        </div>
      </main>
    </div>
  );
};

export default Post;
