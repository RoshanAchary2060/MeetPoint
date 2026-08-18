import imagekit from "../configs/imageKit.js";
import Message from "../models/Message.js";
import { getReceiverSocketId, io } from "../socket/socketHandler.js";

// ============================================================
// SEND MESSAGE
// ============================================================

export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { to_user_id, text } = req.body;

    const image = req.file;

    // --------------------------------------------------------
    // MESSAGE TYPE
    // --------------------------------------------------------

    const messageType = image ? "image" : "text";

    let mediaUrl = "";

    // --------------------------------------------------------
    // IMAGE UPLOAD
    // --------------------------------------------------------

    if (image) {
      const base64File = image.buffer.toString("base64");

      const uploadResponse = await imagekit.files.upload({
        file: base64File,
        fileName: image.originalname || `message_${Date.now()}.jpg`,
        folder: "messages",
      });

      mediaUrl = imagekit.url
        ? imagekit.url({
            path: uploadResponse.filePath,
            transformation: [
              {
                quality: "auto",
              },
              {
                format: "webp",
              },
              {
                width: "1280",
              },
            ],
          })
        : uploadResponse.url;
    }

    // --------------------------------------------------------
    // CREATE MESSAGE
    // --------------------------------------------------------

    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text: text?.trim() || "",
      media_url: mediaUrl,
      message_type: messageType,
    });

    // --------------------------------------------------------
    // POPULATE USERS
    // --------------------------------------------------------

    const populatedMessage = await Message.findById(message._id)
      .populate("from_user_id", "full_name username profile_picture")
      .populate("to_user_id", "full_name username profile_picture");

    // --------------------------------------------------------
    // REAL-TIME SOCKET MESSAGE
    // --------------------------------------------------------

    const receiverSocketId = getReceiverSocketId(to_user_id);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("new-message", populatedMessage);

      console.log(`📩 Message sent to socket: ${receiverSocketId}`);
    } else {
      console.log(`⚠️ Receiver ${to_user_id} is offline`);
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("❌ Send message error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GET CHAT MESSAGES
// ============================================================

export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { to_user_id } = req.body;

    // --------------------------------------------------------
    // FETCH CONVERSATION
    // --------------------------------------------------------

    const messages = await Message.find({
      $or: [
        {
          from_user_id: userId,
          to_user_id,
        },
        {
          from_user_id: to_user_id,
          to_user_id: userId,
        },
      ],
    }).sort({ createdAt: -1 });

    // --------------------------------------------------------
    // MARK RECEIVED MESSAGES AS SEEN
    // --------------------------------------------------------

    await Message.updateMany(
      {
        from_user_id: to_user_id,
        to_user_id: userId,
        seen: false,
      },
      {
        $set: {
          seen: true,
        },
      },
    );

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("❌ Get chat messages error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GET RECENT MESSAGES
// ============================================================

export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const messages = await Message.find({
      $or: [
        {
          from_user_id: userId,
        },
        {
          to_user_id: userId,
        },
      ],
    })
      .populate("from_user_id", "full_name username profile_picture")
      .populate("to_user_id", "full_name username profile_picture")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("❌ Get recent messages error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
