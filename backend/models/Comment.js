import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default mongoose.model("Comment", commentSchema);
