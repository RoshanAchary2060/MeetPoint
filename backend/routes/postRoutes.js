import express from "express";
import { protect } from "../middleware/auth.js";
import {
  addPost,
  deletePost,
  getFeedPosts,
  getShareLink,
  getSinglePost,
  likePost,
} from "../controllers/postController.js";
import { upload } from "../configs/multer.js";

const postRouter = express.Router();

// --- 1. PROTECTED ROUTES ---
postRouter.post("/add", upload.array("images", 4), protect, addPost);
postRouter.get("/feed", protect, getFeedPosts);
postRouter.post("/like", protect, likePost);
postRouter.delete("/:postId", protect, deletePost);

// --- 2. PUBLIC SPECIFIC ROUTES ---
// Must come BEFORE /:postId to prevent Express from treating "share" as a parameter
postRouter.get("/share/:postId", getShareLink);

// --- 3. PUBLIC WILDCARD PARAMETER ROUTES ---
postRouter.get("/:postId", getSinglePost);

export default postRouter;
