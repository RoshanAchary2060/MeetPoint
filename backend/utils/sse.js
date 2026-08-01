import PendingCall from "../models/PendingCall.js";

// Store connection objects: { userId: { res, req, pingInterval } }
const connections = {};

export const addConnection = (userId, req, res) => {
  if (!userId) return;
  const key = userId.toString();

  // 1. Clean up existing active connection if user reconnected or refreshed tab
  if (connections[key]) {
    try {
      clearInterval(connections[key].pingInterval);
      if (!connections[key].res.writableEnded) {
        connections[key].res.end();
      }
    } catch (e) {
      // Connection already closed
    }
  }

  // 2. Keep connection alive with periodic pings every 25s (prevents proxy timeouts)
  const pingInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keep-alive ping\n\n");
    } else {
      clearInterval(pingInterval);
    }
  }, 25000);

  // 3. Save connection state
  connections[key] = { res, req, pingInterval };
  console.log(`🔌 SSE Connected: ${key}`);
};

export const removeConnection = async (userId) => {
  if (!userId) return;
  const key = userId.toString();

  if (connections[key]) {
    clearInterval(connections[key].pingInterval);
    delete connections[key];
    console.log(`❌ SSE Disconnected: ${key}`);
  }

  // EDGE CASE HANDLER: Receiver went offline while ringing
  try {
    const activeRingingCall = await PendingCall.findOne({
      receiverId: key,
      status: "ringing",
    });

    if (activeRingingCall) {
      activeRingingCall.status = "calling";
      await activeRingingCall.save();

      sendEventToUser(activeRingingCall.callerId, {
        type: "CALL_REVERTED_TO_CALLING",
      });
    }
  } catch (error) {
    console.error("Error handling SSE disconnect fallback:", error);
  }
};

export const sendEventToUser = (userId, data) => {
  console.log("Sending event to:", userId);
  console.log("Current connections:", Object.keys(connections));
  if (!userId) return;
  const key = userId.toString();

  if (
    connections[key] &&
    connections[key].res &&
    !connections[key].res.writableEnded
  ) {
    connections[key].res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

export const sendEventToAll = (data, excludeUserId = null) => {
  Object.entries(connections).forEach(([userId, connection]) => {
    if (excludeUserId && userId === excludeUserId.toString()) {
      return;
    }

    if (connection.res && !connection.res.writableEnded) {
      connection.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  });
};
