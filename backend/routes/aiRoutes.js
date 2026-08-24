import express from "express";

import {
  meetPointAI,
} from "../controllers/aiController.js";
import { upload } from "../configs/multer.js";
import { protect } from "../middleware/auth.js";



const aiRouter = express.Router();

aiRouter.post(
  "/",
  protect,
  upload.single("image"),
  meetPointAI,
);

export default aiRouter;
