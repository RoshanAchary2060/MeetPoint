import mongoose from "mongoose";

const pendingCallSchema = new mongoose.Schema(
  {
    callerId: {
      type: String,
      required: true,
    },

    receiverId: {
      type: String,
      required: true,
    },

    caller: {
      id: { type: String },
      full_name: { type: String },
      username: { type: String },
      profile_picture: { type: String },
    },

    // audio or video
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },

    offer: {
      type: Object,
      required: false,
    },

    status: {
      type: String,
      enum: ["calling", "ringing", "connected"],
      default: "calling",
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export default mongoose.model("PendingCall", pendingCallSchema);
