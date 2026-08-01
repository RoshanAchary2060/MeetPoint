import fs from "fs";
// import imageKit from "../configs/imageKit.js";
import imagekit from "../configs/imageKit.js";
import Message from "../models/Message.js";
import {
  addConnection,
  removeConnection,
  sendEventToUser,
} from "../utils/sse.js";

// SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
    const image = req.file;

    let media_url = "";
    let message_type = image ? "image" : "text";

    if (message_type === "image") {
      const fileBuffer = fs.readFileSync(image.path);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: image.originalname,
      });
      media_url = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "1280" },
        ],
      });
    }

    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text,
      media_url,
      message_type,
    });

    res.json({ success: true, message });



    // SEND THE MESSAGE TO THE CLIENT USING SSE
    const messageWithUserData = await Message.findById(message._id).populate(
      "from_user_id",
    );

    sendEventToUser(to_user_id, {
      type: "NEW_MESSAGE",
      data: messageWithUserData,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// GET CHAT MESSAGES
export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id } = req.body;

    const messages = await Message.find({
      $or: [
        { from_user_id: userId, to_user_id },
        { from_user_id: to_user_id, to_user_id: userId },
      ],
    }).sort({ createdAt: -1 });
    await Message.updateMany(
      {
        from_user_id: to_user_id,
        to_user_id: userId,
      },
      { seen: true },
    );
    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// GET USER RECENT MESSAGES
export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const messages = await Message.find({
      to_user_id: userId,
    })
      .populate("from_user_id to_user_id")
      .sort({ createdAt: -1 });

    // const messages = await Message.find(
    //   {
    //     to_user_id: userId,
    //   }.populate("from_user_id to_user_id"),
    // ).sort({ createdAt: -1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
