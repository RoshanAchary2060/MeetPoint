import express from "express";
import { protect } from "../middleware/auth.js";
import {
  addPost,
  deletePost,
  getFeedPosts,
  getShareLink,
  getSinglePost,
  likePost,
  sharePost,
} from "../controllers/postController.js";
import { upload } from "../configs/multer.js";
const postRouter = express.Router();

postRouter.post("/add", upload.array("images", 4), protect, addPost);

postRouter.get("/feed", protect, getFeedPosts);

postRouter.post("/like", protect, likePost);

postRouter.delete("/:postId", protect, deletePost);

postRouter.get("/share/:postId", sharePost);

postRouter.get("/:postId", getSinglePost);
postRouter.get("/share/:postId", getShareLink);

export default postRouter;
