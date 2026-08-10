import { Server } from "socket.io";

const onlineUsers = new Map();

export let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket Connected:", socket.id);

    // ==================================================
    // REGISTER
    // ==================================================

    socket.on("register", (userId) => {
      console.log("📝 REGISTER EVENT");
      console.log("socket.id =", socket.id);
      console.log("userId =", userId);

      socket.userId = userId;

      onlineUsers.set(userId, socket.id);

      console.log("📋 Current Online Users:");

      for (const [id, sid] of onlineUsers.entries()) {
        console.log(id, "=>", sid);
      }
    });

    // ==================================================
    // CALL USER
    // ==================================================

    socket.on("call-user", ({ callerId, receiverId, callType, caller }) => {
      console.log(`📞 ${callType?.toUpperCase()} CALL USER`);

      console.log("Caller:", callerId);
      console.log("Receiver:", receiverId);

      const receiverSocket = onlineUsers.get(receiverId);

      console.log("Receiver socket:", receiverSocket);

      if (!receiverSocket) {
        console.log("🔴 Receiver offline");

        socket.emit("user-offline");

        return;
      }

      io.to(receiverSocket).emit("incoming-call", {
        callerId,
        caller,
        callType,
      });

      console.log(`📤 INCOMING CALL SENT: ${callerId} → ${receiverId}`);
    });

    // ==================================================
    // RINGING
    // ==================================================

    // backend socket.js
    socket.on("call-ringing", ({ callerId }) => {
      console.log(`🔔 Relaying ringing status to callerId: ${callerId}`);

      const callerSocketId = onlineUsers.get(callerId);

      if (callerSocketId) {
        // 💡 Changed "user-ringing" -> "call-ringing"
        io.to(callerSocketId).emit("call-ringing");
        console.log("✅ CALL-RINGING SENT TO CALLER →", callerId);
      } else {
        console.log("❌ Caller socket ID not found in onlineUsers!");
      }
    });    // ==================================================
    // CANCEL CALL
    // ==================================================

    socket.on("cancel-call", ({ receiverId }) => {
      console.log("❌ CANCEL CALL →", receiverId);

      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        return;
      }

      io.to(receiverSocket).emit("call-cancelled");
    });

    // ==================================================
    // ACCEPT CALL
    // ==================================================

    socket.on("accept-call", ({ callerId, callType }) => {
      console.log("✅ ACCEPT CALL");

      console.log("Caller:", callerId);

      console.log("Call type:", callType);

      const callerSocket = onlineUsers.get(callerId);

      if (!callerSocket) {
        console.log("🔴 Caller went offline");

        return;
      }

      io.to(callerSocket).emit("call-accepted", {
        callType,
      });

      console.log("📤 CALL ACCEPTED SENT →", callerId);
    });

    // ==================================================
    // REJECT CALL
    // ==================================================

    socket.on("reject-call", ({ callerId }) => {
      console.log("❌ REJECT CALL →", callerId);

      const callerSocket = onlineUsers.get(callerId);

      if (!callerSocket) {
        return;
      }

      io.to(callerSocket).emit("call-rejected");
    });

    // ==================================================
    // WEBRTC OFFER
    // ==================================================

    socket.on("webrtc-offer", ({ receiverId, offer, callType }) => {
      console.log("📤 WEBRTC OFFER");

      console.log("From:", socket.userId);

      console.log("To:", receiverId);

      console.log("Type:", callType);

      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        console.log("❌ Receiver not found");

        return;
      }

      io.to(receiverSocket).emit("webrtc-offer", {
        callerId: socket.userId,
        offer,
        callType,
      });

      console.log("✅ OFFER FORWARDED");
    });

    // ==================================================
    // WEBRTC ANSWER
    // ==================================================

    socket.on("webrtc-answer", ({ receiverId, answer }) => {
      console.log("📤 WEBRTC ANSWER");

      console.log("From:", socket.userId);

      console.log("To:", receiverId);

      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        console.log("❌ Receiver not found");

        return;
      }

      io.to(receiverSocket).emit("webrtc-answer", {
        answer,
      });

      console.log("✅ ANSWER FORWARDED");
    });

    // ==================================================
    // ICE CANDIDATE
    // ==================================================

    socket.on("ice-candidate", ({ receiverId, candidate }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        return;
      }

      io.to(receiverSocket).emit("ice-candidate", {
        candidate,
      });
    });

    // ==================================================
    // END CALL
    // ==================================================

    socket.on("end-call", ({ receiverId }) => {
      console.log("📴 END CALL");

      console.log("From:", socket.userId);

      console.log("To:", receiverId);

      const receiverSocket = onlineUsers.get(receiverId);

      if (!receiverSocket) {
        console.log("⚠️ Receiver is offline");

        return;
      }

      io.to(receiverSocket).emit("call-ended", {
        callerId: socket.userId,
      });

      console.log("📤 CALL ENDED SENT →", receiverId);
    });

    // ==================================================
    // DISCONNECT
    // ==================================================

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

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

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};
