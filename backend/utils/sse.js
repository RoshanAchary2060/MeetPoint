import PendingCall from "../models/PendingCall.js";

// Store connection objects: { userId: { res, req, pingInterval } }
const connections = {};

export const addConnection = (userId, req, res) => {
  if (!userId) return;

  const key = userId.toString();

  console.log("================================");
  console.log("ADD CONNECTION:", key);
  console.log("Before:", Object.keys(connections));

  const connection = {
    req,
    res,
    pingInterval: null,
  };

  // Close old connection if it exists
  if (connections[key]) {
    clearInterval(connections[key].pingInterval);

    if (!connections[key].res.writableEnded) {
      connections[key].res.end();
    }
  }

  connection.pingInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keep-alive\n\n");
    } else {
      clearInterval(connection.pingInterval);
    }
  }, 25000);

  connections[key] = connection;

  console.log("After:", Object.keys(connections));
  console.log("================================");
};
export const removeConnection = async (userId, res) => {
  if (!userId) return;

  const key = userId.toString();

  console.log("================================");
  console.log("REMOVE CONNECTION:", key);
  console.log("Before:", Object.keys(connections));

  // Ignore stale close events
  if (!connections[key]) {
    console.log("Already removed");
    return;
  }

  if (connections[key].res !== res) {
    console.log("Ignoring stale connection");
    return;
  }

  clearInterval(connections[key].pingInterval);

  delete connections[key];

  console.log("After:", Object.keys(connections));
  console.log("================================");

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
  } catch (err) {
    console.error(err);
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
