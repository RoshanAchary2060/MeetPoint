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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import CommentModal from "./CommentModal";
import { useDispatch } from "react-redux";
import { useEffect } from "react";

const PostCard = ({ post }) => {
  const navigate = useNavigate();
  const [postData, setPostData] = useState(post);
  const dispatch = useDispatch();
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const postWithHashTags = (postData.content || "").replace(
    /(#\w+)/g,
    '<span class="text-indigo-600">$1</span>',
  );

  const currentUser = useSelector((state) => state.user.value);

  const currentUserId = currentUser?._id;

  const [showComments, setShowComments] = useState(false);

  const { getToken } = useAuth();

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
      } else {
        toast(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

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

  // In PostCard.jsx - Replace the handleShare function

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

  const nextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === postData.image_urls.length - 1 ? 0 : prev + 1,
    );
  };

  const previousImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? postData.image_urls.length - 1 : prev - 1,
    );
  };

  useEffect(() => {
    setPostData(post);
  }, [post]);

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
  }, [selectedImageIndex]);

  console.log(postData.comments_count, "comments_count in postcard");

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl">
        {/* User Info */}
        <div
          onClick={() => navigate("/profile/" + postData.user._id)}
          className="inline-flex items-center gap-3 cursor-pointer"
        >
          <img
            src={postData.user?.profile_picture}
            className="w-10 h-10
                  rounded-full shadow"
          />
          <div>
            <div className="flex items-center space-x-1">
              <span>{postData?.user?.full_name}</span>
              <BadgeCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-gray-500 text-sm">
              @{postData.user.username} • {moment(postData.createdAt).fromNow()}
            </div>
          </div>
        </div>
        {/* Content */}
        {postData.content && (
          <div
            className="text-gray-800 text-sm whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: postWithHashTags }}
          />
        )}
        {/* Images */}
        <div className="grid grid-cols-2 gap-2">
          {postData.image_urls.map((img, index) => (
            <img
              key={index}
              src={img}
              onClick={() => setSelectedImageIndex(index)}
              className={`cursor-pointer w-full h-48 object-cover rounded-lg hover:opacity-95 transition
              ${postData.image_urls.length === 1 && "col-span-2 h-auto"}`}
            />
          ))}
        </div>
        {/* Actions */}
        <div
          className="flex items-center gap-4 text-gray-600 text-sm
              pt-2 border-t border-gray-300"
        >
          <div className="flex items-center gap-1">
            <Heart
              onClick={handleLike}
              className={`w-4 h-4 cursor-pointer ${currentUserId && postData.likes.includes(currentUserId) && "text-red-500 fill-red-500"}`}
            />
            <span>{postData.likes.length}</span>
          </div>

          {/* <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{12}</span>
          </div>*/}
          <div
            onClick={() => {
              if (!currentUserId) {
                toast.error("Please login first.");
                return;
              }

              setShowComments(true);
            }}
            className="flex items-center gap-1 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{postData.comments_count || 0}</span>
          </div>

          <div
            onClick={handleShare}
            className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition"
          >
            <Share2 className="w-4 h-4" />
          </div>
          {currentUserId && postData.user._id === currentUserId && (
            <Trash2
              className="w-4 h-4 cursor-pointer text-red-500"
              onClick={handleDelete}
            />
          )}
        </div>
      </div>

      {showComments && (
        <CommentModal
          post={postData}
          setPostData={setPostData}
          onClose={() => setShowComments(false)}
        />
      )}

      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center"
          onClick={() => setSelectedImageIndex(null)}
        >
          <img
            src={postData.image_urls[selectedImageIndex]}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl transition-all duration-200"
          />

          {postData.image_urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previousImage();
                }}
                className="absolute left-6 p-3 rounded-full bg-black/40 hover:bg-black/60
                text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-6 p-3 rounded-full bg-black/40 hover:bg-black/60
                text-white transition cursor-pointer"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              <button
                onClick={() => setSelectedImageIndex(null)}
                className="absolute top-6 right-6 p-3 rounded-full bg-black/40
                hover:bg-black/60 text-white transition cursor-pointer"
              >
                <X className="w-7 h-7" />
              </button>

              <div className="absolute bottom-8 text-white text-sm">
                {selectedImageIndex + 1} / {postData.image_urls.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default PostCard;
