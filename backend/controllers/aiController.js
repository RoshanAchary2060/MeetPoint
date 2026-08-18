import User from "../models/User.js";
import { processMeetPointAI } from "../services/aiService.js";

// =====================================================
// MEETPOINT AI
// =====================================================

export const meetPointAI = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const user = await User.findById(userId).select(
      "full_name username bio location",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await processMeetPointAI({
      message: message.trim(),
      user,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "❌ MeetPoint AI error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to process MeetPoint AI request",
    });
  }
};
