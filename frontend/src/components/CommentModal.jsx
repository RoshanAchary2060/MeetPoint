import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Trash2, X, MessageCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import toast from "react-hot-toast";
import moment from "moment";

import { updatePost } from "../features/posts/postSlice.js";
import socket from "../socket/socket";

const CommentModal = ({ post, onClose, setPostData }) => {
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.user.value);

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const inputRef = useRef(null);

  // ============================================================
  // SYNC UPDATED POST EVERYWHERE
  // ============================================================

  const syncPost = (updatedPost) => {
    if (!updatedPost) return;

    // Update local PostCard / CommentModal state
    setPostData(updatedPost);

    // Update Redux so Feed + other PostCards receive it
    dispatch(updatePost(updatedPost));
  };

  // ============================================================
  // FETCH COMMENTS
  // ============================================================

  const fetchComments = async () => {
    try {
      const token = await getToken();

      const { data } = await api.get(`/api/comment/${post._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setComments(data.comments);

        // IMPORTANT:
        // Backend returns the latest post with comments_count
        syncPost(data.post);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load comments",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ADD COMMENT
  // ============================================================

  const addComment = async () => {
    if (!text.trim()) return;

    try {
      const token = await getToken();

      const { data } = await api.post(
        "/api/comment/add",
        {
          postId: post._id,
          text: text.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message || "Comment added successfully!");

        // Add comment immediately to modal
        setComments((prev) => [data.comment, ...prev]);

        // IMPORTANT:
        // Updates:
        // 1. Current PostCard
        // 2. Feed
        // 3. Shared Post page
        // 4. Redux
        syncPost(data.post);

        setText("");
      } else {
        toast.error(data.message || "Failed to add comment");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong",
      );
    }
  };

  // ============================================================
  // DELETE COMMENT
  // ============================================================

  const deleteComment = async (commentId) => {
    try {
      const token = await getToken();

      const { data } = await api.delete(`/api/comment/${commentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        // Remove from modal immediately
        setComments((prev) =>
          prev.filter((comment) => comment._id !== commentId),
        );

        // IMPORTANT:
        // Sync updated comments_count everywhere
        syncPost(data.post);

        toast.success(data.message || "Comment deleted successfully");
      } else {
        toast.error(data.message || "Failed to delete comment");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong",
      );
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    inputRef.current?.focus();
    fetchComments();

    const onCommentUpdated = (data) => {
      console.log("💬 COMMENT MODAL UPDATE:", data);

      // This modal is for another post
      if (data.post?._id !== post._id) return;

      if (data.action === "added") {
        setComments((prev) => {
          // Prevent duplicate when this is our own comment
          const alreadyExists = prev.some(
            (comment) => comment._id === data.comment?._id,
          );

          if (alreadyExists) {
            return prev;
          }

          return [data.comment, ...prev];
        });

        setPostData(data.post);
      }

      if (data.action === "deleted") {
        setComments((prev) =>
          prev.filter((comment) => comment._id !== data.comment?._id),
        );

        setPostData(data.post);
      }
    };

    socket.on("comment-updated", onCommentUpdated);

    return () => {
      socket.off("comment-updated", onCommentUpdated);
    };
  }, [post._id]);

  return (
    <div
      className="
        fixed inset-0 z-50
        bg-black/40 dark:bg-black/70
        backdrop-blur-sm
        flex items-center justify-center
      "
    >
      <div
        className="
          bg-white dark:bg-slate-900
          w-[95%] max-w-xl
          rounded-2xl
          shadow-2xl
          overflow-hidden
          animate-in fade-in zoom-in duration-200
          transition-colors
        "
      >
        {/* HEADER */}

        <div
          className="
            flex items-center justify-between
            p-5
            border-b border-gray-200 dark:border-slate-700
          "
        >
          <div>
            <h2
              className="
                text-xl font-bold
                flex items-center gap-2
                text-gray-900 dark:text-white
              "
            >
              <MessageCircle size={20} />
              Comments
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              {comments.length} Comments
            </p>
          </div>

          <button
            onClick={onClose}
            className="
              p-2 rounded-full
              text-gray-600 dark:text-slate-300
              hover:bg-gray-100 dark:hover:bg-slate-800
              transition-colors
              cursor-pointer
            "
          >
            <X />
          </button>
        </div>

        {/* COMMENTS */}

        <div className="h-[430px] overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <p className="text-center text-gray-500 dark:text-slate-400">
              Loading...
            </p>
          ) : comments.length === 0 ? (
            <div className="text-center py-20">
              <MessageCircle
                className="mx-auto text-gray-300 dark:text-slate-600"
                size={50}
              />

              <h3 className="font-semibold mt-3 text-gray-900 dark:text-white">
                No comments yet
              </h3>

              <p className="text-gray-500 dark:text-slate-400 text-sm">
                Be the first to comment.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <img
                  src={comment.user_id.profile_picture}
                  alt={comment.user_id.full_name}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div
                    className="
                      bg-gray-100 dark:bg-slate-800
                      rounded-2xl
                      px-4 py-3
                      transition-colors
                    "
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {comment.user_id.full_name}
                        </h4>

                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          @{comment.user_id.username} •{" "}
                          {moment(comment.createdAt).fromNow()}
                        </p>
                      </div>

                      {currentUser &&
                        (comment.user_id._id === currentUser._id ||
                          post.user._id === currentUser._id) && (
                          <button
                            onClick={() => deleteComment(comment._id)}
                            className="
                              shrink-0
                              p-1
                              rounded
                              hover:bg-gray-200 dark:hover:bg-slate-700
                              transition-colors
                              cursor-pointer
                            "
                          >
                            <Trash2
                              size={17}
                              className="
                                text-gray-400
                                hover:text-red-500
                                dark:text-slate-500
                                dark:hover:text-red-400
                              "
                            />
                          </button>
                        )}
                    </div>

                    <p
                      className="
                        mt-3
                        text-sm
                        whitespace-pre-wrap
                        text-gray-700 dark:text-slate-200
                      "
                    >
                      {comment.text}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* INPUT */}

        <div
          className="
            border-t border-gray-200 dark:border-slate-700
            p-4
          "
        >
          <div
            className="
              flex items-center
              bg-gray-100 dark:bg-slate-800
              rounded-full
              px-4 py-2
              transition-colors
            "
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
              className="
                flex-1
                bg-transparent
                outline-none
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-slate-500
              "
              placeholder="Write a comment..."
            />

            <button
              onClick={addComment}
              className="
                ml-2
                bg-indigo-600 hover:bg-indigo-700
                dark:bg-indigo-500 dark:hover:bg-indigo-600
                p-2
                rounded-full
                text-white
                transition-colors
                cursor-pointer
              "
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
