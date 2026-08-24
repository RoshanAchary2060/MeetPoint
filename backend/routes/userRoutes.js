import express from "express";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  declineConnectionRequest,
  disconnectUser,
  discoverUsers,
  followUser,
  getPeopleYouMayKnow,
  getUserConnections,
  getUserData,
  getUserProfiles,
  sendConnectionRequest,
  unfollowUser,
  updateUserData,
} from "../controllers/UserController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../configs/multer.js";
import { getUserRecentMessages } from "../controllers/messageController.js";

const userRouter = express.Router();

userRouter.get("/data", protect, getUserData);
userRouter.post(
  "/update",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  protect,
  updateUserData,
);

userRouter.post("/discover", protect, discoverUsers);

userRouter.post("/follow", protect, followUser);

userRouter.post("/unfollow", protect, unfollowUser);

userRouter.post("/connect", protect, sendConnectionRequest);

userRouter.post("/accept", protect, acceptConnectionRequest);

userRouter.get("/connections", protect, getUserConnections);

userRouter.post("/profiles", getUserProfiles);

userRouter.get("/recent-messages", protect, getUserRecentMessages);

userRouter.post("/decline", protect, declineConnectionRequest);
userRouter.post("/cancel-request", protect, cancelConnectionRequest);
userRouter.post("/disconnect", protect, disconnectUser);
userRouter.get("/suggestions", protect, getPeopleYouMayKnow);
export default userRouter;
