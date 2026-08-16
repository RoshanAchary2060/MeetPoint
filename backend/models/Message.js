import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    from_user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    to_user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    // =====================================================
    // MESSAGE CONTENT
    // =====================================================

    text: {
      type: String,
      trim: true,
    },

    // text | image | call
    message_type: {
      type: String,
      enum: ["text", "image", "call"],
      default: "text",
      required: true,
    },

    // =====================================================
    // IMAGE
    // =====================================================

    media_url: {
      type: String,
    },

    // =====================================================
    // CALL INFORMATION
    // =====================================================

    // audio | video
    call_type: {
      type: String,
      enum: ["audio", "video"],
    },

    // missed | declined | completed
    call_status: {
      type: String,
      enum: ["missed", "declined", "completed"],
    },

    // Duration in seconds
    call_duration: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // SEEN
    // =====================================================

    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default mongoose.model("Message", MessageSchema);
