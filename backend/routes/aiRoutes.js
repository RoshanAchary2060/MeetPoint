import express from "express";

import {
  meetPointAI,
} from "../controllers/aiController.js";

import { protect } from "../middleware/auth.js";

const aiRouter = express.Router();

aiRouter.post("/", protect, meetPointAI);

export default aiRouter;
