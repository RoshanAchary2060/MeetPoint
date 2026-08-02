import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Story from "../models/Story.js";
import { inngest } from "../inngest/index.js";
import User from "../models/User.js";

// Add USER STORY
// Add USER STORY
export const addUserStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, media_type, background_color } = req.body;
    const media = req.file;
    let media_url = "";

    // UPLOAD MEDIA TO IMAGEKIT
    if (media_type === "image" || media_type === "video") {
      if (!media) {
        return res.json({ success: false, message: "No media file provided" });
      }

      // 🟢 FIX: Handle both memoryStorage (buffer) and diskStorage (path)
      const base64File = media.buffer
        ? media.buffer.toString("base64")
        : fs.readFileSync(media.path).toString("base64");

      const response = await imagekit.files.upload({
        file: base64File,
        fileName: media.originalname || `story_${Date.now()}`,
      });

      media_url = response.url;
    }

    // CREATE STORY
    const story = await Story.create({
      user: userId,
      content,
      media_url,
      media_type,
      background_color,
    });

    // SCHEDULE STORY DELETION AFTER 24 HOURS
    await inngest.send({
      name: "app/story.delete",
      data: { storyId: story._id },
    });

    res.json({ success: true, story });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// GET USER STORIES
// GET USER STORIES
// GET USER STORIES
export const getStories = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // 🟢 Target user IDs: Yourself + Your Connections + People You Follow
    const userIds = [
      userId,
      ...(user.connections || []),
      ...(user.following || []),
    ];

    let stories = await Story.find({ user: { $in: userIds } })
      .populate("user", "full_name username profile_picture")
      .populate("viewers", "full_name username profile_picture")
      .sort({ createdAt: -1 })
      .lean();

    // Strip out the private viewers array if the story does NOT belong to the logged-in user
    stories = stories.map((story) => {
      const isOwner = story.user._id.toString() === userId;
      if (!isOwner) {
        delete story.viewers;
      }
      return story;
    });

    res.json({ success: true, stories });
  } catch (error) {
    console.error("Get stories error:", error);
    res.json({ success: false, message: error.message });
  }
};// TRACK STORY VIEW
export const viewStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { storyId } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.json({ success: false, message: "Story not found" });
    }

    // Don't count views from the story owner
    if (story.user.toString() !== userId) {
      await Story.findByIdAndUpdate(storyId, {
        $addToSet: { viewers: userId }, // Ensures unique views
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("View story error:", error);
    res.json({ success: false, message: error.message });
  }
};
