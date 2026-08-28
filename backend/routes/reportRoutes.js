import express from "express";
import { protect } from "../middleware/auth.js";
import { upload } from "../configs/multer.js";
import { reportPost } from "../controllers/reportController.js";

const reportRouter = express.Router();

// REPORT POST
reportRouter.post("/post", protect, upload.array("images", 5), reportPost);

export default reportRouter;
