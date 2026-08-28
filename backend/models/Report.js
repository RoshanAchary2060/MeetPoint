import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: String,
      ref: "User",
      required: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    image_urls: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },

    admin_note: {
      type: String,
      default: "",
      trim: true,
    },

    reviewed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index({ reporter: 1, post: 1 }, { unique: true });

const Report = mongoose.model("Report", reportSchema);

export default Report;
