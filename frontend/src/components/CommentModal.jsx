import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Trash2, X, MessageCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import api from "../api/axios";
import toast from "react-hot-toast";
import moment from "moment";

const CommentModal = ({ post, onClose, setPostData }) => {
  const { getToken } = useAuth();
  const currentUser = useSelector((state) => state.user.value);

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const inputRef = useRef(null);

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
        setPostData(data.post);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!text.trim()) return;

    try {
      const token = await getToken();

      const { data } = await api.post(
        "/api/comment/add",
        {
          postId: post._id,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        toast.success(data.message || "Comment added successfully!"); // ← FIXED: Fallback message
        setComments((prev) => [data.comment, ...prev]);
        setPostData(data.post);
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
  const deleteComment = async (commentId) => {
    try {
      const token = await getToken();

      const { data } = await api.delete(`/api/comment/${commentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setComments((prev) =>
          prev.filter((comment) => comment._id !== commentId),
        );
        setPostData(data.post);
        toast.success(data.message || "Comment deleted successfully"); // ← FIXED
      } else {
        toast.error(data.message || "Failed to delete comment");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Something went wrong");
    }
  };
  useEffect(() => {
    inputRef.current?.focus();
    fetchComments();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
      flex items-center justify-center"
    >
      <div
        className="bg-white w-[95%] max-w-xl rounded-2xl
        shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}

        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle size={20} />
              Comments
            </h2>

            <p className="text-sm text-gray-500">{comments.length} Comments</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X />
          </button>
        </div>

        {/* Comments */}

        <div className="h-[430px] overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : comments.length === 0 ? (
            <div className="text-center py-20">
              <MessageCircle className="mx-auto text-gray-300" size={50} />

              <h3 className="font-semibold mt-3">No comments yet</h3>

              <p className="text-gray-500 text-sm">Be the first to comment.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <img
                  src={comment.user_id.profile_picture}
                  className="w-11 h-11 rounded-full object-cover"
                />

                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {comment.user_id.full_name}
                        </h4>

                        <p className="text-xs text-gray-500">
                          @{comment.user_id.username} •{" "}
                          {moment(comment.createdAt).fromNow()}
                        </p>
                      </div>

                      {(comment.user_id._id === currentUser._id ||
                        post.user._id === currentUser._id) && (
                        <button onClick={() => deleteComment(comment._id)}>
                          <Trash2
                            size={17}
                            className="text-gray-400 hover:text-red-500"
                          />
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700">
                      {comment.text}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}

        <div className="border-t p-4">
          <div
            className="flex items-center bg-gray-100
            rounded-full px-4 py-2"
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              className="flex-1 bg-transparent outline-none"
              placeholder="Write a comment..."
            />

            <button
              onClick={addComment}
              className="ml-2 bg-indigo-600 hover:bg-indigo-700
              p-2 rounded-full text-white"
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
