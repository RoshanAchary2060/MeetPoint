import { Server } from "socket.io";
import Message from "../models/Message.js";

const onlineUsers = new Map();
const activeCalls = new Map();

export let io;

// ==========================================================
// CREATE CALL MESSAGE
// ==========================================================

const createCallMessage = async ({
  callerId,
  receiverId,
  callType,
  callStatus,
  callDuration = 0,
}) => {
  try {
    const message = await Message.create({
      from_user_id: callerId,
      to_user_id: receiverId,

      message_type: "call",

      text: "",

      call_type: callType,

      call_status: callStatus,

      call_duration: callDuration,

      seen: false,
    });

    console.log("💾 CALL MESSAGE CREATED");
    console.log("Message ID:", message._id);
    console.log("Status:", callStatus);
    console.log("Duration:", callDuration);

    // ======================================================
    // SEND CALL MESSAGE TO CALLER
    // ======================================================

    const callerSocket = onlineUsers.get(callerId);

    if (callerSocket) {
      io.to(callerSocket).emit("new-message", message);

      console.log("📤 CALL MESSAGE SENT TO CALLER →", callerId);
    }

    // ======================================================
    // SEND CALL MESSAGE TO RECEIVER
    // ======================================================

    const receiverSocket = onlineUsers.get(receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit("new-message", message);

      console.log("📤 CALL MESSAGE SENT TO RECEIVER →", receiverId);
    }

    return message;
  } catch (error) {
    console.error("❌ CREATE CALL MESSAGE ERROR:", error);

    return null;
  }
};

// ==========================================================
// INITIALIZE SOCKET
// ==========================================================

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket Connected:", socket.id);

    // ======================================================
    // REGISTER USER
    // ======================================================

    socket.on("register", (userId) => {
      console.log("📝 REGISTER EVENT");
      console.log("Socket:", socket.id);
      console.log("User:", userId);

      socket.userId = userId;

      onlineUsers.set(userId, socket.id);

      console.log("📋 ONLINE USERS:");

      for (const [id, socketId] of onlineUsers.entries()) {
        console.log(id, "=>", socketId);
      }
    });

    // ======================================================
    // CALL USER
    // ======================================================

    socket.on(
      "call-user",
      ({ callerId, receiverId, callType, caller, receiver }) => {
        console.log("=================================");
        console.log(`📞 ${callType?.toUpperCase()} CALL`);
        console.log("Caller:", callerId);
        console.log("Receiver:", receiverId);
        console.log("=================================");

        // ==================================================
        // CHECK CALLER BUSY
        // ==================================================

        if (activeCalls.has(callerId)) {
          console.log("🔴 CALLER BUSY");

          socket.emit("call-busy", {
            reason: "caller-busy",
            receiverId,
            receiverName: receiver?.full_name || "User",
          });

          return;
        }

        // ==================================================
        // CHECK RECEIVER BUSY
        // ==================================================

        if (activeCalls.has(receiverId)) {
          console.log("🔴 RECEIVER BUSY");

          socket.emit("call-busy", {
            reason: "receiver-busy",
            receiverId,
            receiverName: receiver?.full_name || "User",
          });

          return;
        }

        // ==================================================
        // CHECK RECEIVER ONLINE
        // ==================================================

        const receiverSocket = onlineUsers.get(receiverId);

        if (!receiverSocket) {
          console.log("🔴 RECEIVER OFFLINE");

          socket.emit("user-offline");

          return;
        }

        // ==================================================
        // CREATE CALL DATA
        // ==================================================

        const callData = {
          callerId,
          receiverId,
          callType,

          accepted: false,

          startedAt: null,
        };

        // ==================================================
        // RESERVE BOTH USERS
        // ==================================================

        activeCalls.set(callerId, {
          ...callData,
          otherUserId: receiverId,
        });

        activeCalls.set(receiverId, {
          ...callData,
          otherUserId: callerId,
        });

        console.log("📞 ACTIVE CALL CREATED");
        console.log(callData);

        // ==================================================
        // SEND INCOMING CALL
        // ==================================================

        io.to(receiverSocket).emit("incoming-call", {
          callerId,
          caller,
          callType,
        });

        console.log("📤 INCOMING CALL SENT →", receiverId);
      },
    );

    // ======================================================
    // CALL RINGING
    // ======================================================

    socket.on("call-ringing", ({ callerId }) => {
      console.log("🔔 CALL RINGING →", callerId);

      const callerSocketId = onlineUsers.get(callerId);

      if (!callerSocketId) {
        console.log("❌ CALLER SOCKET NOT FOUND");

        return;
      }

      io.to(callerSocketId).emit("call-ringing");

      console.log("✅ CALL-RINGING SENT");
    });

    // ======================================================
    // CANCEL CALL
    // ======================================================

    socket.on("cancel-call", async ({ receiverId }) => {
      console.log("❌ CANCEL CALL");

      const callerId = socket.userId;

      console.log("Caller:", callerId);
      console.log("Receiver:", receiverId);

      const callData = activeCalls.get(callerId);

      // ==================================================
      // VERIFY CALL
      // ==================================================

      if (!callData || callData.otherUserId !== receiverId) {
        console.log("⚠️ CANCEL IGNORED — INVALID CALL");

        return;
      }

      console.log("📞 CANCELLED CALL DATA:", callData);

      // ==================================================
      // MISSED CALL
      // ==================================================

      if (!callData.accepted) {
        console.log("📵 SAVING MISSED CALL");

        await createCallMessage({
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
          callStatus: "missed",
          callDuration: 0,
        });
      }

      // ==================================================
      // REMOVE ACTIVE CALL
      // ==================================================

      activeCalls.delete(callerId);
      activeCalls.delete(receiverId);

      console.log("🧹 ACTIVE CALL REMOVED");

      // ==================================================
      // NOTIFY RECEIVER
      // ==================================================

      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("call-cancelled");
      }
    });

    // ======================================================
    // ACCEPT CALL
    // ======================================================

    socket.on("accept-call", ({ callerId, callType }) => {
      console.log("✅ ACCEPT CALL");

      const receiverId = socket.userId;

      console.log("Caller:", callerId);
      console.log("Receiver:", receiverId);
      console.log("Type:", callType);

      const callData = activeCalls.get(receiverId);

      // ==================================================
      // VERIFY CALL
      // ==================================================

      if (!callData || callData.otherUserId !== callerId) {
        console.log("❌ CALL NO LONGER EXISTS");

        return;
      }

      // ==================================================
      // MARK ACCEPTED
      // ==================================================

      const startedAt = Date.now();

      const updatedCallData = {
        ...callData,

        accepted: true,

        startedAt,
      };

      activeCalls.set(callerId, {
        ...updatedCallData,
        otherUserId: receiverId,
      });

      activeCalls.set(receiverId, {
        ...updatedCallData,
        otherUserId: callerId,
      });

      console.log("🟢 CALL MARKED ACCEPTED");

      console.log("Started At:", startedAt);

      // ==================================================
      // NOTIFY CALLER
      // ==================================================

      const callerSocket = onlineUsers.get(callerId);

      if (!callerSocket) {
        console.log("🔴 CALLER OFFLINE");

        return;
      }

      io.to(callerSocket).emit("call-accepted", {
        callType: callData.callType || callType,
      });

      console.log("📤 CALL ACCEPTED SENT →", callerId);
    });

    // ======================================================
    // REJECT CALL
    // ======================================================

    socket.on("reject-call", async ({ callerId }) => {
      console.log("❌ REJECT CALL →", callerId);

      const receiverId = socket.userId;

      const callData = activeCalls.get(receiverId);

      // ==================================================
      // VERIFY CALL
      // ==================================================

      if (!callData || callData.otherUserId !== callerId) {
        console.log("⚠️ REJECT IGNORED — INVALID CALL");

        return;
      }

      // ==================================================
      // SAVE DECLINED CALL
      // ==================================================

      await createCallMessage({
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
        callStatus: "declined",
        callDuration: 0,
      });

      // ==================================================
      // REMOVE ACTIVE CALL
      // ==================================================

      activeCalls.delete(callerId);
      activeCalls.delete(receiverId);

      console.log("🧹 ACTIVE CALL REMOVED");

      // ==================================================
      // NOTIFY CALLER
      // ==================================================

      const callerSocket = onlineUsers.get(callerId);

      if (callerSocket) {
        io.to(callerSocket).emit("call-rejected");
      }

      console.log("📤 CALL REJECTED SENT →", callerId);
    });

    // ======================================================
    // WEBRTC OFFER
    // ======================================================

    socket.on("webrtc-offer", ({ receiverId, offer, callType }) => {
      console.log("📤 WEBRTC OFFER");

      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        console.log("❌ RECEIVER NOT FOUND");

        return;
      }

      io.to(receiverSocket).emit("webrtc-offer", {
        callerId: socket.userId,
        offer,
        callType,
      });
    });

    // ======================================================
    // WEBRTC ANSWER
    // ======================================================

    socket.on("webrtc-answer", ({ receiverId, answer }) => {
      console.log("📤 WEBRTC ANSWER");

      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        return;
      }

      io.to(receiverSocket).emit("webrtc-answer", {
        answer,
      });
    });

    // ======================================================
    // ICE CANDIDATE
    // ======================================================

    socket.on("ice-candidate", ({ receiverId, candidate }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        return;
      }

      io.to(receiverSocket).emit("ice-candidate", {
        candidate,
      });
    });

    // ======================================================
    // END CALL
    // ======================================================

    socket.on("end-call", async ({ receiverId }) => {
      console.log("📴 END CALL");

      const callerId = socket.userId;

      console.log("From:", callerId);
      console.log("To:", receiverId);

      const callData = activeCalls.get(callerId);

      // ==================================================
      // VERIFY CALL
      // ==================================================

      if (!callData || callData.otherUserId !== receiverId) {
        console.log("⚠️ END CALL IGNORED — INVALID CALL");

        return;
      }

      // ==================================================
      // ONLY SAVE COMPLETED IF ACCEPTED
      // ==================================================

      if (callData.accepted) {
        const duration = Math.max(
          0,
          Math.floor((Date.now() - callData.startedAt) / 1000),
        );

        console.log("📞 CALL DURATION:", duration, "seconds");

        await createCallMessage({
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
          callStatus: "completed",
          callDuration: duration,
        });
      }

      // ==================================================
      // REMOVE ACTIVE CALL
      // ==================================================

      activeCalls.delete(callerId);
      activeCalls.delete(receiverId);

      console.log("🧹 ACTIVE CALL REMOVED");

      // ==================================================
      // NOTIFY OTHER USER
      // ==================================================

      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("call-ended", {
          callerId,
        });
      }

      console.log("📤 CALL ENDED SENT →", receiverId);
    });

    // ======================================================
    // DISCONNECT
    // ======================================================

    socket.on("disconnect", async () => {
      console.log("🔴 Socket disconnected:", socket.id);

      const disconnectedUserId = socket.userId;

      // ==================================================
      // HANDLE ACTIVE CALL
      // ==================================================

      if (disconnectedUserId && activeCalls.has(disconnectedUserId)) {
        const callData = activeCalls.get(disconnectedUserId);



        const otherUserId = callData.otherUserId;

        activeCalls.delete(disconnectedUserId);

        if (otherUserId) {
          activeCalls.delete(otherUserId);
        }

        console.log("📴 USER DISCONNECTED DURING CALL");

        console.log(disconnectedUserId, "↔", otherUserId);

        // ==================================================
        // SAVE CALL HISTORY
        // ==================================================

        if (callData.accepted) {
          const duration = callData.startedAt
            ? Math.max(0, Math.floor((Date.now() - callData.startedAt) / 1000))
            : 0;

          await createCallMessage({
            callerId: callData.callerId,
            receiverId: callData.receiverId,
            callType: callData.callType,
            callStatus: "completed",
            callDuration: duration,
          });
        } else {
          await createCallMessage({
            callerId: callData.callerId,
            receiverId: callData.receiverId,
            callType: callData.callType,
            callStatus: "missed",
            callDuration: 0,
          });
        }

        // ==================================================
        // REMOVE ACTIVE CALL
        // ==================================================

        activeCalls.delete(disconnectedUserId);

        activeCalls.delete(otherUserId);

        console.log("🧹 ACTIVE CALL REMOVED AFTER DISCONNECT");

        // ==================================================
        // NOTIFY OTHER USER
        // ==================================================

        const otherSocket = onlineUsers.get(otherUserId);

        if (otherSocket) {
          io.to(otherSocket).emit("call-ended", {
            callerId: disconnectedUserId,
          });
        }
      }

      // ==================================================
      // REMOVE USER FROM ONLINE USERS
      // ==================================================

      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);

          console.log(`🔴 User ${userId} removed from online users`);

          break;
        }
      }
    });
  });
};

// ==========================================================
// GET RECEIVER SOCKET
// ==========================================================

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};
