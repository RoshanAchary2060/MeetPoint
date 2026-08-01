import Comment from "../models/Comment.js";
import Post from "../models/Post.js";

// =========================
// ADD COMMENT
// =========================
export const addComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId, text } = req.body;

    if (!text || !text.trim()) {
      return res.json({
        success: false,
        message: "Comment cannot be empty.",
      });
    }

    const comment = await Comment.create({
      post_id: postId,
      user_id: userId,
      text: text.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "user_id"
    );

    await Post.findByIdAndUpdate(postId, {
      $inc: { comments_count: 1 },
    });

    const updatedPost = await Post.findById(postId).populate("user");

    return res.json({
      success: true,
      comment: populatedComment,
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET COMMENTS
// =========================
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({
      post_id: postId,
    })
      .populate("user_id")
      .sort({ createdAt: -1 });

    const updatedPost = await Post.findById(postId).populate("user");

    return res.json({
      success: true,
      comments,
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// DELETE COMMENT
// =========================
export const deleteComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId).populate({
      path: "post_id",
      populate: { path: "user" } // Pre-populate the post's user if needed
    });

    if (!comment) {
      return res.json({
        success: false,
        message: "Comment not found.",
      });
    }

    // Only comment owner or post owner can delete
    if (
      comment.user_id.toString() !== userId &&
      comment.post_id.user._id.toString() !== userId
    ) {
      return res.json({
        success: false,
        message: "Unauthorized.",
      });
    }

    // Store post ID before deleting comment
    const postId = comment.post_id._id;

    await Comment.findByIdAndDelete(commentId);

    await Post.findByIdAndUpdate(postId, {
      $inc: { comments_count: -1 },
    });

    const updatedPost = await Post.findById(postId)
      .populate("user");

    return res.json({
      success: true,
      message: "Comment deleted successfully.",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    return res.json({
      success: false,
      message: error.message,
    });
  }
};
