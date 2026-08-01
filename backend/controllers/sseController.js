import { addConnection, removeConnection, sendEventToUser } from "../utils/sse.js";
import PendingCall from "../models/PendingCall.js";
import { getCallByReceiver, removeCall } from "../utils/calls.js";

export const sseController = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).end();
  }

  // Guard: Avoid double header execution if middleware already responded
  if (res.headersSent) {
    return;
  }

  // 1. Set SSE Headers once
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  // 2. Register with connection manager (does NOT set headers again)
  addConnection(userId, req, res);

  // 3. Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

  // 4. Check pending call state from database
  try {
    const pendingCall = await PendingCall.findOne({
      receiverId: userId,
      status: "ringing",
    });

    if (pendingCall) {
      res.write(
        `data: ${JSON.stringify({
          type: "INCOMING_AUDIO_CALL",
          from_user_id: pendingCall.callerId,
          caller: pendingCall.caller,
        })}\n\n`
      );
    }
  } catch (err) {
    console.error("Error querying pending calls in SSE:", err);
  }

  // 5. Handle client disconnect
  req.on("close", () => {
    removeConnection(userId);

    const call = getCallByReceiver(userId);
    if (call) {
      const [callerId] = call;
      sendEventToUser(callerId, {
        type: "CALL_RECEIVER_OFFLINE",
      });
      removeCall(callerId);
    }
  });
};
