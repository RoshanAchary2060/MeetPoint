import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import { sendEventToUser, sendEventToAll } from "../utils/sse.js";

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
          const fileBuffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: fileBuffer,
            fileName: image.originalname,
            folder: "posts",
          });
          const url = imagekit.url({
            path: response.filePath,
            transformation: [
              { quality: "auto" },
              { format: "webp" },
              { width: "1280" },
            ],
          });
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

    sendEventToAll({
      type: "POST_CREATED",
      data: populatedPost,
      senderId: userId,
    });

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
    const user = await User.findById(userId);
    // USER CONNECTIONS AND FOLLOWINGS
    const userIds = [userId, ...user.following, ...user.connections];
    const posts = await Post.find({ user: { $in: userIds } })
      .populate("user")
      .sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// LIKE POSTS
export const likePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((user) => user !== userId);
      await post.save();
      res.json({ success: true, message: "Post unliked" });
    } else {
      post.likes.push(userId);
      await post.save();
      res.json({ success: true, message: "Post liked" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
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

    sendEventToAll({
      type: "POST_DELETED",
      data: {
        postId,
      },
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
