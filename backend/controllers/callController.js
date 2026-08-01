import { sendEventToUser } from "../utils/sse.js";
import User from "../models/User.js";
import PendingCall from "../models/PendingCall.js";
import { addCall, updateCallStatus } from "../utils/calls.js"; // 👈 Added updateCallStatus import

// Helper to get userId as a clean string from Clerk req.auth
const getUserIdFromReq = (req) => {
  let id = null;
  if (typeof req.auth === "function") {
    id = req.auth().userId;
  } else {
    id = req.auth?.userId;
  }
  return id ? id.toString() : null;
};

// START AUDIO CALL
export const startAudioCall = async (req, res) => {
  try {
    const fromUserId = getUserIdFromReq(req);
    const { to_user_id } = req.body;

    if (!fromUserId || !to_user_id) {
      return res.status(400).json({
        success: false,
        message: "Missing caller or receiver ID",
      });
    }

    const caller = await User.findById(fromUserId);
    if (!caller) {
      return res.status(444).json({
        success: false,
        message: "Caller user profile not found",
      });
    }

    const callerData = {
      id: caller._id.toString(),
      full_name: caller.full_name,
      username: caller.username,
      profile_picture: caller.profile_picture || "",
    };

    // Remove any stale calls involving these two users
    await PendingCall.deleteMany({
      $or: [
        { callerId: fromUserId },
        { receiverId: fromUserId },
        { callerId: to_user_id.toString() },
        { receiverId: to_user_id.toString() },
      ],
    });

    // Create new Pending Call record safely
    await PendingCall.create({
      callerId: fromUserId,
      receiverId: to_user_id.toString(),
      caller: callerData,
      status: "calling",
    });

    // Notify Receiver via SSE
    sendEventToUser(to_user_id.toString(), {
      type: "INCOMING_AUDIO_CALL",
      from_user_id: fromUserId,
      caller: callerData,
    });

    if (typeof addCall === "function") {
      addCall(fromUserId, to_user_id.toString());
    }

    return res.json({
      success: true,
      message: "Call started",
    });
  } catch (error) {
    console.error("❌ START CALL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// NOTIFY CALL RINGING
export const notifyRinging = async (req, res) => {
  try {
    const receiverId = getUserIdFromReq(req);
    const { from_user_id } = req.body;

    if (!from_user_id || !receiverId) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const callerId = from_user_id.toString();

    // Update state in PendingCall DB
    await PendingCall.updateOne(
      { callerId: callerId, receiverId: receiverId },
      { $set: { status: "ringing" } }
    );

    // Safely execute updateCallStatus if imported
    if (typeof updateCallStatus === "function") {
      updateCallStatus(callerId, "ringing");
    }

    // Send SSE event back to caller
    sendEventToUser(callerId, {
      type: "CALL_RINGING",
    });

    console.log(`🔔 Sent CALL_RINGING to caller: ${callerId}`);

    return res.json({
      success: true,
      message: "Ringing notification sent",
    });
  } catch (error) {
    console.error("❌ RINGING ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ACCEPT AUDIO CALL
export const acceptAudioCall = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { from_user_id } = req.body;

    if (!userId || !from_user_id) {
      return res.status(400).json({ success: false, message: "Missing user IDs" });
    }

    await PendingCall.updateOne(
      { callerId: from_user_id.toString(), receiverId: userId },
      { $set: { status: "connected" } }
    );

    // Notify caller that call was accepted
    sendEventToUser(from_user_id.toString(), {
      type: "CALL_ACCEPTED",
      by_user_id: userId,
    });

    return res.json({ success: true, message: "Call accepted" });
  } catch (error) {
    console.error("❌ ACCEPT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// REJECT AUDIO CALL
export const rejectAudioCall = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { from_user_id } = req.body;

    if (!userId || !from_user_id) {
      return res.status(400).json({ success: false, message: "Missing user IDs" });
    }

    await PendingCall.deleteOne({
      callerId: from_user_id.toString(),
      receiverId: userId,
    });

    sendEventToUser(from_user_id.toString(), {
      type: "CALL_REJECTED",
      by_user_id: userId,
    });

    return res.json({ success: true, message: "Call rejected" });
  } catch (error) {
    console.error("❌ REJECT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CANCEL CALL
export const cancelCall = async (req, res) => {
  try {
    const fromUserId = getUserIdFromReq(req);
    const { to_user_id } = req.body;

    if (!fromUserId || !to_user_id) {
      return res.status(400).json({ success: false, message: "Missing user IDs" });
    }

    await PendingCall.deleteOne({
      callerId: fromUserId,
      receiverId: to_user_id.toString(),
    });

    sendEventToUser(to_user_id.toString(), {
      type: "CALL_CANCELLED",
      by_user_id: fromUserId,
    });

    return res.json({ success: true, message: "Call cancelled" });
  } catch (error) {
    console.error("❌ CANCEL ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// WEBRTC SIGNALING: OFFER
export const sendOffer = async (req, res) => {
  try {
    const fromUserId = getUserIdFromReq(req);
    const { to_user_id, offer } = req.body;

    if (!fromUserId || !to_user_id || !offer) {
      return res.status(400).json({ success: false, message: "Offer or receiver missing" });
    }

    await PendingCall.updateOne(
      { callerId: fromUserId, receiverId: to_user_id.toString() },
      { $set: { offer } }
    );

    sendEventToUser(to_user_id.toString(), {
      type: "WEBRTC_OFFER",
      from_user_id: fromUserId,
      offer,
    });

    return res.json({ success: true, message: "Offer sent" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// WEBRTC SIGNALING: ANSWER
export const sendAnswer = async (req, res) => {
  try {
    const fromUserId = getUserIdFromReq(req);
    const { to_user_id, answer } = req.body;

    if (!fromUserId || !to_user_id || !answer) {
      return res.status(400).json({
        success: false,
        message: "Answer or receiver missing",
      });
    }

    sendEventToUser(to_user_id.toString(), {
      type: "WEBRTC_ANSWER",
      from_user_id: fromUserId,
      answer,
    });

    return res.json({ success: true, message: "Answer sent" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// WEBRTC SIGNALING: ICE CANDIDATE
export const sendIceCandidate = async (req, res) => {
  try {
    const fromUserId = getUserIdFromReq(req);
    const { to_user_id, candidate } = req.body;

    if (!fromUserId || !to_user_id || !candidate) {
      return res.status(400).json({
        success: false,
        message: "ICE candidate or receiver missing",
      });
    }

    sendEventToUser(to_user_id.toString(), {
      type: "WEBRTC_ICE_CANDIDATE",
      from_user_id: fromUserId,
      candidate,
    });

    return res.json({ success: true, message: "ICE candidate sent" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// END CALL
export const endCall = async (req, res) => {
  try {
    const fromUserId = getUserIdFromReq(req);
    const { to_user_id } = req.body;

    if (!fromUserId || !to_user_id) {
      return res.status(400).json({ success: false, message: "Missing user IDs" });
    }

    const targetUserId = to_user_id.toString();

    await PendingCall.deleteMany({
      $or: [
        { callerId: fromUserId, receiverId: targetUserId },
        { callerId: targetUserId, receiverId: fromUserId },
      ],
    });

    sendEventToUser(targetUserId, {
      type: "CALL_ENDED",
      by_user_id: fromUserId,
    });

    return res.json({ success: true, message: "Call ended" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CHECK PENDING INCOMING CALL
export const getPendingCall = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const pendingCall = await PendingCall.findOne({
      receiverId: userId,
      status: { $in: ["calling", "ringing"] },
    });

    if (!pendingCall) {
      return res.json({ success: true, hasCall: false });
    }

    return res.json({
      success: true,
      hasCall: true,
      pendingCall: {
        from_user_id: pendingCall.callerId,
        caller: pendingCall.caller,
        status: pendingCall.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
