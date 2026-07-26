import fs from "fs";
import imageKit from "../configs/imageKit.js";
import Message from "../models/Message.js";

// CREATE AN EMPTY OBJECT TO STORE SERVER SIDE EVENT CONNECTIONS
const connections = {};

// CONTROLLER FUNCTION FOR THE SERVER SIDE EVENT ENDPOINT
export const sseController = (req, res) => {
  const { userId } = req.params;
  console.log("New client connected:", userId);

  // SET SSE HEADERS
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // ADD THE CLIENT RESPONSE OBJECT TO THE CONNECTIONS OBJECT
  connections[userId] = res;
  // SEND AN INITIAL EVENT TO THE CLIENT
  res.write("log: Connected to SSE stream\n\n");

  // HANDLE CLIENT DISCONNECTION
  req.on("close", () => {
    // REMOVE THE CLIENT RESPONSE OBJECT FROM THE CONNECTIONS ARRAY
    delete connections[userId];
    console.log("Client disconnected:", userId);
  });
};

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
      const response = await imageKit.upload({
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

    if (connections[to_user_id]) {
      connections[to_user_id].write(
        `data: ${JSON.stringfy(messageWithUserData)}\n\n`,
      );
    }
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
        from_userId: to_user_id,
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
    const messages = await Message.find(
      {
        to_user_id: userId,
      }.populate("from_user_id to_user_id"),
    ).sort({ createdAt: -1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
