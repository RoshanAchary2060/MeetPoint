import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import useWebRTC from "../hooks/useWebRTC";
import api from "../api/axios";
import { clearSSEEvent } from "../features/sse/sseSlice";
import CallingScreen from "./CallingScreen";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCall from "./ActiveCall";
import { useCall } from "../context/callContext.jsx";
import { fetchConnections } from "../features/connections/connectionsSlice.js";
import { fetchUser } from "../features/user/usersSlice.js";
import toast from "react-hot-toast";
import { addMessages } from "../features/messages/messagesSlice.js"; // ← ADD THIS
import { useNavigate, useLocation } from "react-router-dom";
import socket from "../socket/socket.js";
const CallManager = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const sseEvent = useSelector((state) => state.sse.event);

  const {
    callState,
    setCallState,
    setRemoteUser,
    remoteUser,
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
    endCall: endWebRTC,
  } = useWebRTC();

  const targetUserId = remoteUser?.id || remoteUser?._id;

  const sendSignaling = async (endpoint, data) => {
    try {
      const token = await getToken();
      await api.post(`/api/call/${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(`Signaling error on /${endpoint}:`, err);
    }
  };

  useEffect(() => {
    registerWebRTCControls({ endCall: endWebRTC, toggleMute });
  }, [endWebRTC, toggleMute]);

  useEffect(() => {
    if (!sseEvent) return;

    const handleSSE = async () => {
      console.log(
        "HANDLE SSE",
        sseEvent.type,
        performance.now(),
        document.visibilityState,
      );
      switch (sseEvent.type) {
        case "RELATIONSHIP_UPDATE": {
          console.log("🔥 RELATIONSHIP_UPDATE received");

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
                <b>{fromUser.full_name || fromUser?.full_name || "Someone"}</b>{" "}
                sent you a connection request.
              </p>
              <button
                onClick={() => {
                  navigate("/connections", {
                    state: { activeTab: "Received" },
                  });
                  toast.dismiss();
                }}
                className="mt-2 px-3 py-1 rounded bg-indigo-600 text-white"
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

        // ========================================
        // ADD THIS CASE FOR REAL-TIME MESSAGES
        // ========================================
        case "NEW_MESSAGE": {
          const sender = sseEvent.message.from_user_id;
          const currentChatPath = `/messages/${sseEvent.message.from_user_id._id}`;

          if (location.pathname === currentChatPath) {
            // Already chatting with this user.
            // Don't show toast.
            break;
          }

          toast(
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={sender.profile_picture}
                  alt={sender.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div>
                  <p className="font-semibold">{sender.full_name}</p>
                  <p className="text-sm text-gray-500">sent you a message</p>
                </div>
              </div>

              <button
                onClick={() => {
                  navigate(`/messages/${sender._id}`);
                  toast.dismiss();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-1"
              >
                View
              </button>
            </div>,
            {
              duration: 6000,
            },
          );

          break;
        }
        case "INCOMING_AUDIO_CALL": {
          setRemoteUser(sseEvent.caller);
          setCallState("incoming");

          const token = await getToken();
          await api.post(
            "/api/call/ringing",
            { from_user_id: sseEvent.from_user_id },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          break;
        }

        case "CALL_RINGING": {
          if (callState === "calling") {
            setCallState("ringing");
          }
          break;
        }

        case "CALL_ACCEPTED": {
          if (isNegotiationStarted()) {
            console.log("Ignoring duplicate CALL_ACCEPTED");
            break;
          }
          startNegotiation();

          setCallState("connected");
          const offer = await createOffer((candidate) => {
            sendSignaling("ice-candidate", { to_user_id: targetUserId, candidate });
          });
          socket.emit("webrtc-offer", {
            receiverId: targetUserId,
            offer,
          });          break;
        }

        case "WEBRTC_OFFER": {
          if (isNegotiationStarted()) {
            console.log("Ignoring duplicate WEBRTC_OFFER");
            break;
          }
          startNegotiation();

          setCallState("connected");
          const answer = await createAnswer(sseEvent.offer, (candidate) => {
            socket.emit("ice-candidate", {
              receiverId: targetUserId,
              candidate,
            });          });
          socket.emit("webrtc-answer", {
            receiverId: targetUserId,
            answer,
          });          break;
        }
        case "WEBRTC_ANSWER": {
          await setRemoteAnswer(sseEvent.answer);
          break;
        }

        case "WEBRTC_ICE_CANDIDATE": {
          await addIceCandidate(sseEvent.candidate);
          break;
        }

        case "CALL_REJECTED":
        case "CALL_CANCELLED":
        case "CALL_ENDED":
        case "CALL_RECEIVER_OFFLINE": {
          if (targetUserId) {
            socket.emit("end-call", {
              receiverId: targetUserId,
            });          }
          endWebRTC();
          resetCallUI();
          break;
        }

        default:
          break;
      }

      dispatch(clearSSEEvent());
    };

    handleSSE();
  }, [sseEvent]);

  useEffect(() => {
    console.log("CALL STATE changed =", callState);
  }, [callState]);

  return (
    <>
      {children}
      {callState === "calling" || callState === "ringing" ? (
        <CallingScreen />
      ) : null}
      {callState === "incoming" ? <IncomingCallModal /> : null}
      {callState === "connected" ? (
        <ActiveCall toggleMute={toggleMute} />
      ) : null}
    </>
  );
};

export default CallManager;
