import { useEffect, useCallback } from "react";

import { useSelector, useDispatch } from "react-redux";

import { useAuth } from "@clerk/clerk-react";

import useWebRTC from "../hooks/useWebRTC";

import CallingScreen from "./CallingScreen";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCall from "./ActiveCall";

import { useCall } from "../context/callContext.jsx";

import { clearSSEEvent } from "../features/sse/sseSlice";

import { fetchConnections } from "../features/connections/connectionsSlice.js";

import { fetchUser } from "../features/user/usersSlice.js";

import toast from "react-hot-toast";

import { useNavigate, useLocation } from "react-router-dom";

import socket from "../socket/socket.js";

const CallManager = ({ children }) => {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const location = useLocation();

  const { userId, getToken } = useAuth();

  const sseEvent = useSelector((state) => state.sse.event);

  const {
    callState,
    setCallState,

    remoteUser,
    setRemoteUser,

    callType,
    setCallType,

    startNegotiation,
    isNegotiationStarted,

    registerWebRTCControls,

    endCall: resetCallUI,
  } = useCall();

  const {
    createOffer,
    createAnswer,

    setRemoteAnswer,
    addIceCandidate,

    toggleMute,
    toggleCamera,

    localVideoRef,
    remoteVideoRef,

    endCall: endWebRTC,
  } = useWebRTC();

  // =========================================================
  // REMOTE USER ID
  // =========================================================
  //
  const getRemoteUserId = useCallback(() => {
    return remoteUser?.id || remoteUser?._id || null;
  }, [remoteUser]);
  //
  const hangUpCall = useCallback(() => {
    const receiverId = getRemoteUserId();

    console.log("=================================");
    console.log("📴 ENDING CALL");
    console.log("Call state:", callState);
    console.log("Remote user:", remoteUser);
    console.log("Receiver ID:", receiverId);
    console.log("=================================");

    if (receiverId) {
      // ============================================
      // CALL HAS NOT BEEN ACCEPTED
      // ============================================

      if (callState === "calling" || callState === "ringing") {
        console.log("📤 Sending CALL CANCELLED →", receiverId);

        socket.emit("cancel-call", {
          receiverId,
        });
      }

      // ============================================
      // CALL IS ALREADY ACTIVE
      // ============================================
      else if (callState === "connected") {
        console.log("📤 Sending CALL ENDED →", receiverId);

        socket.emit("end-call", {
          receiverId,
        });
      }

      // ============================================
      // INCOMING SIDE
      // ============================================
      else if (callState === "incoming") {
        console.log("📤 Sending CALL CANCELLED →", receiverId);

        socket.emit("cancel-call", {
          receiverId,
        });
      }
    }

    // ============================================
    // CLEAN OUR SIDE IMMEDIATELY
    // ============================================

    endWebRTC();
    resetCallUI();

    console.log("✅ OUR CALL UI CLOSED");
  }, [callState, remoteUser, getRemoteUserId, endWebRTC, resetCallUI]);



  // =========================================================
  // REGISTER WEBRTC CONTROLS
  // =========================================================

  useEffect(() => {
    registerWebRTCControls({
      endCall: endWebRTC,
      toggleMute,
      toggleCamera,
    });
  }, [registerWebRTCControls, endWebRTC, toggleMute, toggleCamera]);

  // =========================================================
  // SOCKET CONNECTION
  // =========================================================

  // CallManager.jsx (Caller A side)

  useEffect(() => {
    if (!userId) {
      return;
    }

    console.log("🔌 Connecting socket:", userId);

    if (!socket.connected) {
      socket.connect();
    }

    const registerUser = () => {
      console.log("📝 Registering:", userId);

      socket.emit("register", userId);
    };

    if (socket.connected) {
      registerUser();
    }

    socket.on("connect", registerUser);

    return () => {
      socket.off("connect", registerUser);
    };
  }, [userId]);

  // =========================================================
  // SSE
  // =========================================================

  useEffect(() => {
    if (!sseEvent) {
      return;
    }

    const handleSSE = async () => {
      console.log("📡 SSE:", sseEvent.type);

      switch (sseEvent.type) {
        case "RELATIONSHIP_UPDATE": {
          const token = await getToken();

          dispatch(fetchConnections(token));

          dispatch(fetchUser(token));

          break;
        }

        case "CONNECTION_REQUEST_RECEIVED": {
          const fromUser =
            typeof sseEvent.fromUser === "string"
              ? JSON.parse(sseEvent.fromUser)
              : sseEvent.fromUser;

          toast(
            <div>
              <p>
                <b>{fromUser?.full_name || "Someone"}</b> sent you a connection
                request.
              </p>

              <button
                onClick={() => {
                  navigate("/connections", {
                    state: {
                      activeTab: "Received",
                    },
                  });

                  toast.dismiss();
                }}
                className="
                    mt-2
                    px-3
                    py-1
                    rounded
                    bg-indigo-600
                    text-white
                  "
              >
                View
              </button>
            </div>,
            {
              duration: Infinity,
            },
          );

          break;
        }
        case "CALL_CANCELLED": {
          console.log("❌ Received CALL_CANCELLED event");
          endWebRTC();
          resetCallUI();
          toast.dismiss();
          break;
        }

        case "NEW_FOLLOWER_RECEIVED": {
          const follower = sseEvent.follower;

          toast(
            (t) => (
              <div className="flex items-center gap-3">
                <img
                  src={
                    follower?.profile_picture ||
                    "https://via.placeholder.com/40"
                  }
                  alt={follower?.full_name}
                  className="
                      w-8
                      h-8
                      rounded-full
                      object-cover
                    "
                />

                <p className="text-sm">
                  <b>{follower?.full_name || "Someone"}</b> started following
                  you.
                </p>

                <button
                  onClick={() => {
                    navigate("/connections", {
                      state: {
                        activeTab: "Followers",
                      },
                    });

                    toast.dismiss(t.id);
                  }}
                  className="
                      px-3
                      py-1
                      text-xs
                      rounded
                      bg-purple-600
                      text-white
                    "
                >
                  View
                </button>
              </div>
            ),
            {
              duration: 5000,
            },
          );

          break;
        }

        case "NEW_MESSAGE": {
          const message = sseEvent.message;

          if (!message) {
            break;
          }

          const sender = message.from_user_id;

          const senderId = sender?._id || sender;

          const isCurrentlyInChat =
            location.pathname === `/messages/${senderId}`;

          if (isCurrentlyInChat) {
            break;
          }

          toast(
            (t) => (
              <div className="flex items-center gap-3">
                <img
                  src={
                    sender?.profile_picture || "https://via.placeholder.com/40"
                  }
                  alt={sender?.full_name}
                  className="
                      w-10
                      h-10
                      rounded-full
                      object-cover
                    "
                />

                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {sender?.full_name || "New Message"}
                  </p>

                  <p className="text-xs text-gray-500 truncate">
                    {message.text || "Sent an image"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigate(`/messages/${senderId}`);

                    toast.dismiss(t.id);
                  }}
                  className="
                      bg-indigo-600
                      text-white
                      text-xs
                      px-3
                      py-1.5
                      rounded-lg
                    "
                >
                  View
                </button>
              </div>
            ),
            {
              duration: 4000,
            },
          );

          break;
        }

        default:
          break;
      }

      dispatch(clearSSEEvent());
    };

    handleSSE();
  }, [sseEvent, getToken, dispatch, navigate, location.pathname]);

  // =========================================================
  // END CALL — IMPORTANT
  // =========================================================

  // =========================================================
  // SOCKET CALL EVENTS
  // =========================================================

  useEffect(() => {
    // =======================================================
    // INCOMING CALL
    // =======================================================

    const handleIncomingCall = ({ callerId, caller, callType }) => {
      console.log("📞 INCOMING CALL", {
        callerId,
        caller,
        callType,
      });

      setRemoteUser({
        id: callerId,

        username: caller?.username,

        full_name: caller?.full_name,

        profile_picture: caller?.profile_picture,
      });

      setCallType(callType || "audio");

      setCallState("incoming");
    };

    // =======================================================
    // RINGING
    // =======================================================

    const handleCallRinging = () => {
      console.log("🔔 CALL RINGING");

      setCallState("ringing");
    };

    // =======================================================
    // ACCEPTED
    // =======================================================

    const handleCallAccepted = async ({ callType: acceptedCallType }) => {
      console.log("✅ CALL ACCEPTED BY RECEIVER");

      const receiverId = getRemoteUserId();

      if (!receiverId) {
        console.error("❌ Receiver ID missing");

        toast.error("Receiver information missing");

        return;
      }

      if (isNegotiationStarted()) {
        console.log("⚠️ Negotiation already started");

        return;
      }

      startNegotiation();

      const finalCallType = acceptedCallType || callType || "audio";

      setCallType(finalCallType);

      console.log("🎤 CREATING OFFER", {
        receiverId,
        callType: finalCallType,
      });

      try {
        const offer = await createOffer((candidate) => {
          socket.emit("ice-candidate", {
            receiverId,
            candidate,
          });
        });

        console.log("📤 SENDING OFFER");

        socket.emit("webrtc-offer", {
          receiverId,
          offer,
          callType: finalCallType,
        });

        console.log("✅ OFFER SENT");
      } catch (error) {
        console.error("❌ OFFER CREATION FAILED:", error);

        endWebRTC();
        resetCallUI();

        toast.error("Could not start the call");
      }
    };

    // =======================================================
    // OFFER RECEIVED
    // =======================================================

    const handleWebRTCOffer = async ({
      callerId,
      offer,
      callType: offerCallType,
    }) => {
      console.log("📥 WEBRTC OFFER RECEIVED", {
        callerId,
        callType: offerCallType,
      });

      if (isNegotiationStarted()) {
        console.log("⚠️ Already negotiating");

        return;
      }

      const finalCallerId = callerId || getRemoteUserId();

      if (!finalCallerId) {
        console.error("❌ Caller ID missing");

        return;
      }

      startNegotiation();

      if (offerCallType) {
        setCallType(offerCallType);
      }

      try {
        console.log("🎤 CREATING ANSWER");

        const answer = await createAnswer(offer, (candidate) => {
          socket.emit("ice-candidate", {
            receiverId: finalCallerId,
            candidate,
          });
        });

        console.log("📤 SENDING ANSWER");

        socket.emit("webrtc-answer", {
          receiverId: finalCallerId,
          answer,
        });

        // DO NOT SET CONNECTED HERE.
        //
        // useWebRTC will set connected
        // when ICE actually connects.

        console.log("✅ ANSWER SENT. WAITING FOR WEBRTC...");
      } catch (error) {
        console.error("❌ ANSWER CREATION FAILED:", error);

        endWebRTC();
        resetCallUI();

        toast.error("Could not answer the call");
      }
    };

    // =======================================================
    // ANSWER RECEIVED
    // =======================================================

    const handleWebRTCAnswer = async ({ answer }) => {
      console.log("📥 WEBRTC ANSWER RECEIVED");

      await setRemoteAnswer(answer);
    };

    // =======================================================
    // ICE
    // =======================================================

    const handleIceCandidate = async ({ candidate }) => {
      console.log("🧊 ICE CANDIDATE RECEIVED");

      await addIceCandidate(candidate);
    };

    // =======================================================
    // REJECT
    // =======================================================

    const handleCallRejected = () => {
      console.log("❌ CALL REJECTED");

      endWebRTC();
      resetCallUI();

      toast.error("Call rejected");
    };

    // =======================================================
    // CANCEL
    // =======================================================

    const handleCallCancelled = () => {
      console.log("❌ CALL CANCELLED");

      endWebRTC();
      resetCallUI();
    };

    // =======================================================
    // END CALL
    // =======================================================

    const handleCallEnded = () => {
      console.log("📴 REMOTE USER ENDED CALL");

      // Close our WebRTC
      endWebRTC();

      // Close our call UI
      resetCallUI();

      console.log("✅ CALL CLOSED LOCALLY");
    };

    // =======================================================
    // OFFLINE
    // =======================================================

    const handleUserOffline = () => {
      console.log("🔴 USER OFFLINE");

      toast.error("User is currently offline");

      endWebRTC();
      resetCallUI();
    };

    // =======================================================
    // REGISTER
    // =======================================================

    socket.on("incoming-call", handleIncomingCall);

    socket.on("call-ringing", handleCallRinging);

    socket.on("call-accepted", handleCallAccepted);

    socket.on("webrtc-offer", handleWebRTCOffer);

    socket.on("webrtc-answer", handleWebRTCAnswer);

    socket.on("ice-candidate", handleIceCandidate);

    socket.on("call-rejected", handleCallRejected);

    socket.on("call-cancelled", handleCallCancelled);

    socket.on("call-ended", handleCallEnded);

    socket.on("user-offline", handleUserOffline);

    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {
      socket.off("incoming-call", handleIncomingCall);

      socket.off("call-ringing", handleCallRinging);

      socket.off("call-accepted", handleCallAccepted);

      socket.off("webrtc-offer", handleWebRTCOffer);

      socket.off("webrtc-answer", handleWebRTCAnswer);

      socket.off("ice-candidate", handleIceCandidate);

      socket.off("call-rejected", handleCallRejected);

      socket.off("call-cancelled", handleCallCancelled);

      socket.off("call-ended", handleCallEnded);

      socket.off("user-offline", handleUserOffline);
    };
  }, [
    setCallState,
    setRemoteUser,
    setCallType,

    callType,

    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,

    startNegotiation,
    isNegotiationStarted,

    getRemoteUserId,

    endWebRTC,
    resetCallUI,
  ]);

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      {children}

      {(callState === "calling" || callState === "ringing") && (
        <CallingScreen onCancel={hangUpCall}/>
      )}

      {callState === "incoming" && <IncomingCallModal />}

      {callState === "connected" && (
        <ActiveCall
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          onEndCall={hangUpCall}
        />
      )}
    </>
  );
};

export default CallManager;
