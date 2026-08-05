import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import { sendEventToUser, sendEventToAll } from "../utils/sse.js";
import { io } from "../socket/socketHandler.js";

//  ADD POST

export const addPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, post_type } = req.body;
    const images = req.files || [];
    let image_urls = [];

    if (images.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          // 🟢 Convert buffer to Base64 string for @imagekit/nodejs
          const base64File = image.buffer.toString("base64");

          const response = await imagekit.files.upload({
            file: base64File, // 👈 Pass Base64 string here
            fileName: image.originalname || `post_${Date.now()}.jpg`,
            folder: "posts",
          });

          // 🟢 Build transformed URL or use response.url directly
          // Option A: If you want transformations
          const url = imagekit.url
            ? imagekit.url({
                path: response.filePath,
                transformation: [
                  { quality: "auto" },
                  { format: "webp" },
                  { width: "1280" },
                ],
              })
            : response.url;

          return url;
        }),
      );
    }

    const post = await Post.create({
      user: userId,
      content,
      image_urls,
      post_type,
    });

    // Populate user before sending
    const populatedPost = await Post.findById(post._id).populate("user");

    // sendEventToAll({
    //   type: "POST_CREATED",
    //   data: populatedPost,
    //   senderId: userId,
    // });

    io.emit("POST_CREATED", populatedPost);

    res.json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// GET POSTS
export const getFeedPosts = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId).select("following connections");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // 🟢 Deduplicate user IDs & handle null checks safely
    const following = user.following || [];
    const connections = user.connections || [];
    const userIds = Array.from(new Set([userId, ...following, ...connections]));

    // 🟢 Support pagination (default page 1, 10 posts per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ user: { $in: userIds } })
      .populate("user", "full_name username profile_picture") // populate only required fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      page,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res.json({ success: false, message: error.message });
  }
};
// LIKE POSTS
// LIKE / UNLIKE POST
export const likePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.json({
        success: false,
        message: "Post not found",
      });
    }

    // Unlike
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id !== userId);
    }
    // Like
    else {
      post.likes.push(userId);
    }

    // ✅ Save changes to MongoDB
    await post.save();

    // ✅ Fetch the updated post with populated user
    const updatedPost = await Post.findById(postId).populate(
      "user",
      "full_name username profile_picture"
    );

    // ✅ Broadcast to every connected client
    io.emit("POST_LIKED", updatedPost);

    return res.json({
      success: true,
      message: post.likes.includes(userId)
        ? "Post liked"
        : "Post unliked",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Like post error:", error);

    return res.json({
      success: false,
      message: error.message,
    });
  }
};
// DELETE POST
export const deletePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.json({
        success: false,
        message: "Post not found",
      });
    }

    // Check ownership
    if (post.user !== userId) {
      return res.json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Post.findByIdAndDelete(postId);

    io.emit("POST_DELETED", {
      postId,
    });

    // Optional: delete all comments of this post
    await Comment.deleteMany({
      post_id: postId,
    });

    return res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// SHARE POST
export const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate("user");

    if (!post) {
      return res.json({
        success: false,
        message: "Post not found",
      });
    }

    res.json({
      success: true,
      shareUrl: `${process.env.FRONTEND_URL}/post/${postId}`,
    });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE POST
// GET SINGLE POST (Public)
export const getSinglePost = async (req, res) => {
  console.log("inside getSinglePost", req.params);
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate("user");

    if (!post) {
      return res.json({ success: false, message: "Post not found" });
    }
    console.log("getsingle post successfully returning");

    res.json({
      success: true,
      post,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// SHARE POST
// postController.js
export const getShareLink = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.json({
        success: false,
        message: "Post not found",
      });
    }

    // Standardize URL formatting
    let baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // Auto-fix if https:// protocol was omitted in env variable
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }

    // Strip trailing slashes if present
    baseUrl = baseUrl.replace(/\/$/, "");

    return res.json({
      success: true,
      url: `${baseUrl}/post/${postId}`,
    });
  } catch (error) {
    console.log(error);

    return res.json({
      success: false,
      message: error.message,
    });
  }
};
