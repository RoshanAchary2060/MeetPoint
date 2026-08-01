import express from "express";
import { protect } from "../middleware/auth.js";
import {
  addComment,
  getComments,
  deleteComment,
} from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.post("/add", protect, addComment);

commentRouter.get("/:postId", protect, getComments);

commentRouter.delete("/:commentId", protect, deleteComment);

export default commentRouter;
