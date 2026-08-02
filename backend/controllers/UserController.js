import imagekit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";
import Connection from "../models/Connection.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import fs from "fs";

import { sendEventToUser } from "../utils/sse.js";
import Message from "../models/Message.js";

// Helper to get userId from Clerk req.auth regardless of version
const getUserIdFromReq = (req) => {
  if (typeof req.auth === "function") {
    return req.auth().userId;
  }
  return req.auth?.userId;
};

// GET USER DATA USING USERID
export const getUserData = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// UPDATE USER DATA USING USERID
// UPDATE USER DATA USING USERID
export const updateUserData = async (req, res) => {
  const profileFile = req.files?.profile?.[0];
  const coverFile = req.files?.cover?.[0];

  try {
    const userId = getUserIdFromReq(req);

    if (!userId) {
      return res.json({
        success: false,
        message: "Unauthorized: No user ID found",
      });
    }

    const { username, bio, location, full_name } = req.body;

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.json({
        success: false,
        message: "User not found in database",
      });
    }

    const updatedData = {};

    if (full_name !== undefined) updatedData.full_name = full_name;
    if (bio !== undefined) updatedData.bio = bio;
    if (location !== undefined) updatedData.location = location;

    // Check username availability if changed
    if (username && username !== currentUser.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.json({
          success: false,
          message: "Username is already taken",
        });
      }
      updatedData.username = username;
    }

    // Upload Profile Picture
    if (profileFile) {
      console.log(profileFile);
      // const buffer = fs.readFileSync(profileFile.path);
      const buffer = profileFile.buffer;
      const profileUpload = await imagekit.upload({
        file: buffer,
        fileName: profileFile.originalname,
      });

      updatedData.profile_picture = imagekit.url({
        path: profileUpload.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "512" },
        ],
      });
    }

    // Upload Cover Photo
    if (coverFile) {
      // const buffer = fs.readFileSync(coverFile.path);
      const buffer = coverFile.buffer;
      const coverUpload = await imagekit.upload({
        file: buffer,
        fileName: coverFile.originalname,
      });

      updatedData.cover_photo = imagekit.url({
        path: coverUpload.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "1280" },
        ],
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
      runValidators: true,
    });

    return res.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};
// FIND USERS USING USERNAME, EMAIL, LOCATION, NAME
export const discoverUsers = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });

    const filteredUsers = allUsers.filter((user) => user._id !== userId);
    res.json({
      success: true,
      users: filteredUsers,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// FOLLOW USER
export const followUser = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id } = req.body;

    const user = await User.findById(userId);
    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "You are already following this user",
      });
    }

    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();
    // after successfully following
    sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(id, { type: "RELATIONSHIP_UPDATE" });

    res.json({ success: true, message: "Now you are following this user" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// UNFOLLOW USER
export const unfollowUser = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id } = req.body;

    const user = await User.findById(userId);
    user.following = user.following?.filter((f) => f !== id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers?.filter((f) => f !== userId);
    await toUser.save();

    sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(id, { type: "RELATIONSHIP_UPDATE" });

    res.json({
      success: true,
      message: "You are no longer following this user",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Send Connection  Request
// Send Connection Request - Alternative Fix
export const sendConnectionRequest = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id } = req.body;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const connectionRequests = await Connection.find({
      from_user_id: userId,
      created_at: { $gt: last24Hours },
    });

    if (connectionRequests.length >= 20) {
      return res.json({ success: false, message: "Limit reached: 20 requests in 24h" });
    }

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (!connection) {
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id
      });

      await inngest.send({
        name: "app/connection-request",
        data: { connectionId: newConnection._id }
      });

      sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
      sendEventToUser(id, { type: "RELATIONSHIP_UPDATE" });

      // FIX: Get sender data as plain object
      const sender = await User.findById(userId)
        .select("_id full_name username profile_picture")
        .lean();

      // FIX: Send as JSON string if needed
      sendEventToUser(id, {
        type: "CONNECTION_REQUEST_RECEIVED",
        fromUser: JSON.stringify({
          _id: sender._id,
          full_name: sender.full_name,
          username: sender.username,
          profile_picture: sender.profile_picture
        })
      });

      return res.json({
        success: true,
        message: "Connection request sent successfully"
      });

    } else if (connection.status === "accepted") {
      return res.json({ success: false, message: "Already connected" });
    }

    return res.json({ success: false, message: "Connection request pending" });

  } catch (error) {
    console.error(error);
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}// GET USER CONNECTIONS
//
//
export const getUserConnections = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const user = await User.findById(userId).populate("connections followers following");
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    const connections = user.connections;
    const followers = user.followers;
    const following = user.following;
    const pendingConnections = (
      await Connection.find({ to_user_id: userId, status: "pending" }).populate("from_user_id")
    ).map((connection) => connection.from_user_id);
    const sentConnections = (
      await Connection.find({ from_user_id: userId, status: "pending" }).populate("to_user_id")
    ).map((connection) => connection.to_user_id);
    res.json({
      success: true,
      connections,
      followers,
      following,
      pendingConnections,
      sentConnections,
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};// ACCEPT CONNECTION REQUEST
export const acceptConnectionRequest = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id } = req.body;

    const connection = await Connection.findOneAndUpdate(
      { from_user_id: id, to_user_id: userId, status: "pending" },
      { status: "accepted" },
      { new: true }
    );

    if (!connection) {
      return res.json({ success: false, message: "Request not found or already accepted" });
    }

    await User.findByIdAndUpdate(userId, { $addToSet: { connections: id } });
    await User.findByIdAndUpdate(id, { $addToSet: { connections: userId } });

    sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(id, { type: "RELATIONSHIP_UPDATE" });

    res.json({ success: true, message: "Connection accepted successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
// GET USER PROFILES
export const getUserProfiles = async (req, res) => {
  try {
    const { profileId } = req.body;
    const profile = await User.findById(profileId);
    if (!profile) {
      return res.json({ success: false, message: "Profile not found" });
    }
    const posts = await Post.find({
      user: profileId,
    }).populate("user");
    res.json({ success: true, profile, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// DECLINE CONNECTION REQUEST
export const declineConnectionRequest = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id } = req.body;

    const connection = await Connection.findOneAndDelete({
      from_user_id: id,
      to_user_id: userId,
      status: "pending",
    });

    if (!connection) {
      return res.json({ success: false, message: "Connection request not found" });
    }

    sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(id, { type: "RELATIONSHIP_UPDATE" });

    res.json({ success: true, message: "Connection request declined" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
// CANCEL SENT CONNECTION REQUEST
export const cancelConnectionRequest = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { userId: targetId } = req.body;

    const connection = await Connection.findOneAndDelete({
      from_user_id: userId,
      to_user_id: targetId,
      status: "pending",
    });

    if (!connection) {
      return res.json({ success: false, message: "Connection request not found" });
    }

    sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(targetId, { type: "RELATIONSHIP_UPDATE" });

    res.json({ success: true, message: "Connection request cancelled" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
}
// DISCONNECT (Remove mutual connection)
export const disconnectUser = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { userId: targetId } = req.body;

    await User.findByIdAndUpdate(userId, { $pull: { connections: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { connections: userId } });

    await Connection.findOneAndDelete({
      $or: [
        { from_user_id: userId, to_user_id: targetId },
        { from_user_id: targetId, to_user_id: userId },
      ],
    });

    await Message.deleteMany({
      $or: [
        { from_user_id: userId, to_user_id: targetId },
        { from_user_id: targetId, to_user_id: userId },
      ],
    });

    sendEventToUser(userId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(targetId, { type: "RELATIONSHIP_UPDATE" });
    sendEventToUser(targetId, { type: "DISCONNECTED_BY_USER", withUserId: userId });

    res.json({ success: true, message: "Disconnected successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
