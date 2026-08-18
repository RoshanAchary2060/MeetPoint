import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import moment from "moment";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";

import api from "../api/axios";
import toast from "react-hot-toast";
import CommentModal from "./CommentModal";

const PostCard = ({ post }) => {
  const navigate = useNavigate();

  const [postData, setPostData] = useState(post);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showComments, setShowComments] = useState(false);

  const currentUser = useSelector((state) => state.user.value);
  const currentUserId = currentUser?._id;

  const { getToken } = useAuth();

  const images = postData.image_urls || [];
  const likes = postData.likes || [];

  const postWithHashTags = (postData.content || "").replace(
    /(#\w+)/g,
    '<span class="text-indigo-600 dark:text-indigo-400">$1</span>',
  );

  // ============================================================
  // LIKE
  // ============================================================

  const handleLike = async () => {
    if (!currentUserId) {
      return toast("Please login first.");
    }

    try {
      const { data } = await api.post(
        "/api/post/like",
        { postId: postData._id },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message);

        // Update post immediately
        if (data.post) {
          setPostData(data.post);
        }
      } else {
        toast(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async () => {
    try {
      const { data } = await api.delete(`/api/post/${postData._id}`, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // SHARE
  // ============================================================

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/post/${postData._id}`;

      await navigator.clipboard.writeText(shareUrl);

      toast.success("Post link copied to clipboard!");
    } catch (error) {
      console.error(error);
      toast.error("Unable to share post");
    }
  };

  // ============================================================
  // IMAGE NAVIGATION
  // ============================================================

  const nextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1,
    );
  };

  const previousImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1,
    );
  };

  // ============================================================
  // UPDATE POST DATA
  // ============================================================

  useEffect(() => {
    setPostData(post);
  }, [post]);

  // ============================================================
  // KEYBOARD IMAGE NAVIGATION
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedImageIndex === null) return;

      if (e.key === "Escape") {
        setSelectedImageIndex(null);
      }

      if (e.key === "ArrowRight") {
        nextImage();
      }

      if (e.key === "ArrowLeft") {
        previousImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImageIndex, images.length]);

  return (
    <>
      {/* ======================================================
          POST CARD
      ====================================================== */}

      <div
        className="
          bg-white
          dark:bg-slate-900
          rounded-xl
          shadow
          dark:shadow-black/20
          p-4
          space-y-4
          w-full
          max-w-2xl
          border
          border-transparent
          dark:border-slate-800
          transition-colors
          duration-300
        "
      >
        {/* ====================================================
            USER INFO
        ==================================================== */}

        <div
          onClick={() => navigate("/profile/" + postData.user._id)}
          className="inline-flex items-center gap-3 cursor-pointer"
        >
          <img
            src={postData.user?.profile_picture}
            alt={postData.user?.full_name}
            className="
              w-10
              h-10
              rounded-full
              shadow
              object-cover
            "
          />

          <div>
            <div className="flex items-center space-x-1">
              <span
                className="
                  text-slate-800
                  dark:text-white
                  transition-colors
                "
              >
                {postData?.user?.full_name}
              </span>

              <BadgeCheck className="w-4 h-4 text-blue-500" />
            </div>

            <div
              className="
                text-gray-500
                dark:text-slate-400
                text-sm
              "
            >
              @{postData.user.username} • {moment(postData.createdAt).fromNow()}
            </div>
          </div>
        </div>

        {/* ====================================================
            CONTENT
        ==================================================== */}

        {postData.content && (
          <div
            className="
              text-gray-800
              dark:text-slate-200
              text-sm
              whitespace-pre-line
            "
            dangerouslySetInnerHTML={{
              __html: postWithHashTags,
            }}
          />
        )}

        {/* ====================================================
            IMAGES
        ==================================================== */}

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                onClick={() => setSelectedImageIndex(index)}
                alt=""
                className={`
                  cursor-pointer
                  w-full
                  h-48
                  object-cover
                  rounded-lg
                  hover:opacity-95
                  transition
                  ${images.length === 1 ? "col-span-2 h-auto" : ""}
                `}
              />
            ))}
          </div>
        )}

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <div
          className="
            flex
            items-center
            gap-4
            text-gray-600
            dark:text-slate-400
            text-sm
            pt-2
            border-t
            border-gray-300
            dark:border-slate-700
            transition-colors
          "
        >
          {/* LIKE */}

          <div className="flex items-center gap-1">
            <Heart
              onClick={handleLike}
              className={`
                w-4
                h-4
                cursor-pointer
                transition
                ${
                  currentUserId && likes.includes(currentUserId)
                    ? "text-red-500 fill-red-500"
                    : "hover:text-red-500"
                }
              `}
            />

            <span>{likes.length}</span>
          </div>

          {/* COMMENT */}

          <div
            onClick={() => {
              if (!currentUserId) {
                toast.error("Please login first.");
                return;
              }

              setShowComments(true);
            }}
            className="
              flex
              items-center
              gap-1
              cursor-pointer
              hover:text-indigo-600
              dark:hover:text-indigo-400
              transition
            "
          >
            <MessageCircle className="w-4 h-4" />

            <span>{postData.comments_count || 0}</span>
          </div>

          {/* SHARE */}

          <div
            onClick={handleShare}
            className="
              flex
              items-center
              gap-1
              cursor-pointer
              hover:text-indigo-600
              dark:hover:text-indigo-400
              transition
            "
          >
            <Share2 className="w-4 h-4" />
          </div>

          {/* DELETE */}

          {currentUserId && postData.user._id === currentUserId && (
            <Trash2
              className="
                  w-4
                  h-4
                  cursor-pointer
                  text-red-500
                  hover:text-red-600
                  dark:text-red-400
                  dark:hover:text-red-300
                  transition
                "
              onClick={handleDelete}
            />
          )}
        </div>
      </div>

      {/* ======================================================
          COMMENTS MODAL
      ====================================================== */}

      {showComments && (
        <CommentModal
          post={postData}
          setPostData={setPostData}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* ======================================================
          IMAGE VIEWER
      ====================================================== */}

      {selectedImageIndex !== null && (
        <div
          className="
            fixed
            inset-0
            bg-black/90
            dark:bg-black/95
            z-[9999]
            flex
            items-center
            justify-center
          "
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* IMAGE */}

          <img
            src={images[selectedImageIndex]}
            onClick={(e) => e.stopPropagation()}
            alt=""
            className="
              max-h-[90vh]
              max-w-[90vw]
              rounded-xl
              shadow-2xl
              transition-all
              duration-200
            "
          />

          {images.length > 1 && (
            <>
              {/* PREVIOUS */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previousImage();
                }}
                className="
                  absolute
                  left-6
                  p-3
                  rounded-full
                  bg-black/40
                  hover:bg-black/60
                  text-white
                  transition
                  cursor-pointer
                "
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              {/* NEXT */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="
                  absolute
                  right-6
                  p-3
                  rounded-full
                  bg-black/40
                  hover:bg-black/60
                  text-white
                  transition
                  cursor-pointer
                "
              >
                <ChevronRight className="w-8 h-8" />
              </button>

              {/* CLOSE */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(null);
                }}
                className="
                  absolute
                  top-6
                  right-6
                  p-3
                  rounded-full
                  bg-black/40
                  hover:bg-black/60
                  text-white
                  transition
                  cursor-pointer
                "
              >
                <X className="w-7 h-7" />
              </button>

              {/* IMAGE COUNTER */}

              <div
                className="
                  absolute
                  bottom-8
                  text-white
                  text-sm
                  bg-black/40
                  backdrop-blur-sm
                  px-3
                  py-1
                  rounded-full
                "
              >
                {selectedImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default PostCard;
