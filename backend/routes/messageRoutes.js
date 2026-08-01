import express from "express";
import {
  getChatMessages,
  sendMessage,
} from "../controllers/messageController.js";
import { upload } from "../configs/multer.js";
import { protect } from "../middleware/auth.js";
import { sseController } from "../controllers/sseController.js";

const messageRouter = express.Router();

messageRouter.get("/sse/:userId", sseController);

messageRouter.post("/send", upload.single("image"), protect, sendMessage);

messageRouter.post("/get", protect, getChatMessages);

export default messageRouter;
