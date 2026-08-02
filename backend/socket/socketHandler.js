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

    // =========================
    // REGISTER
    // =========================
    socket.on("register", (userId) => {
      console.log("REGISTER EVENT");
      console.log("socket.id =", socket.id);
      console.log("userId =", userId);

      // ⭐ ADD THIS
      socket.userId = userId;

      onlineUsers.set(userId, socket.id);

      console.log("Current Map");

      for (const [id, sid] of onlineUsers.entries()) {
        console.log(id, "=>", sid);
      }
    });

    // =========================
    // CALL USER
    // =========================
    socket.on("call-user", ({ callerId, receiverId, caller }) => {
      console.log("CALL USER");

      console.log("Current Online Users");

      for (const [id, sid] of onlineUsers.entries()) {
        console.log(id, sid);
      }

      const receiverSocket = onlineUsers.get(receiverId);

      console.log("receiver socket =", receiverSocket);

      io.fetchSockets().then((sockets) => {
        console.log(
          "All Connected Socket IDs:",
          sockets.map((s) => s.id)
        );
      });

      if (!receiverSocket) {
        socket.emit("user-offline");
        return;
      }

      io.to(receiverSocket).emit("incoming-call", {
        callerId,
        caller,
      });

      console.log("EMITTED TO", receiverSocket);
    });
    // =========================
    // RINGING
    // =========================
    socket.on("call-ringing", ({ callerId }) => {
      const callerSocket = onlineUsers.get(callerId);

      if (callerSocket) {
        io.to(callerSocket).emit("call-ringing");
      }
    });

    // =========================
    // ACCEPT
    // =========================
    socket.on("accept-call", ({ callerId }) => {
      const callerSocket = onlineUsers.get(callerId);

      if (callerSocket) {
        io.to(callerSocket).emit("call-accepted");
      }
    });

    // =========================
    // REJECT
    // =========================
    socket.on("reject-call", ({ callerId }) => {
      const callerSocket = onlineUsers.get(callerId);

      if (callerSocket) {
        io.to(callerSocket).emit("call-rejected");
      }
    });

    // =========================
    // OFFER
    // =========================
    socket.on("webrtc-offer", ({ receiverId, offer }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("webrtc-offer", {
          offer,
        });
      }
    });

    // =========================
    // ANSWER
    // =========================
    socket.on("webrtc-answer", ({ receiverId, answer }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("webrtc-answer", {
          answer,
        });
      }
    });

    // =========================
    // ICE
    // =========================
    socket.on("ice-candidate", ({ receiverId, candidate }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("ice-candidate", {
          candidate,
        });
      }
    });

    // =========================
    // END CALL
    // =========================
    socket.on("end-call", ({ receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("call-ended");
      }
    });

    // =========================
    // DISCONNECT
    // =========================
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);

        console.log(`🔴 ${socket.userId} disconnected`);
        console.log("Online Users:", onlineUsers.size);
      }
    });
  });
};

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};
