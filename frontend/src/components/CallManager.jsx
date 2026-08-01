import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import useWebRTC from "../hooks/useWebRTC";
import api from "../api/axios";
import { clearSSEEvent } from "../features/sse/sseSlice";
import { useCall } from "../context/CallContext"; // Added missing import

import CallingScreen from "./CallingScreen";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCall from "./ActiveCall";

const CallManager = ({ children }) => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const sseEvent = useSelector((state) => state.sse.event);
  const {
    callState,
    setCallState,
    setRemoteUser,
    remoteUser,
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
    if (!sseEvent) return;

    const handleSSE = async () => {
      console.log(
        "HANDLE SSE",
        sseEvent.type,
        performance.now(),
        document.visibilityState,
      );
      switch (sseEvent.type) {
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

        // case "CALL_ACCEPTED": {
        //   console.log("CALL_ACCEPTED handler START");
        //   const offer = await createOffer((candidate) => {
        //     sendSignaling("ice-candidate", {
        //       to_user_id: targetUserId,
        //       candidate,
        //     });
        //   });
        //   console.log("Offer created");

        //   await sendSignaling("offer", { to_user_id: targetUserId, offer });
        //   console.log("Offer sent");
        //   console.log("Setting callState connected");
        //   setCallState("connected");
        //   console.log("Connected state requested");
        //   break;
        // }

        case "CALL_ACCEPTED": {
          console.log("===== CALL_ACCEPTED =====");

          // Show the ActiveCall UI immediately
          setCallState("connected");
          console.log("REMOTE USER", remoteUser);
          console.log("TARGET USER", targetUserId);
          const offer = await createOffer((candidate) => {
            sendSignaling("ice-candidate", {
              to_user_id: targetUserId,
              candidate,
            });
          });

          console.log("Offer created");

          await sendSignaling("offer", {
            to_user_id: targetUserId,
            offer,
          });

          console.log("Offer sent");

          break;
        }

        // case "WEBRTC_OFFER": {
        //   const answer = await createAnswer(sseEvent.offer, (candidate) => {
        //     sendSignaling("ice-candidate", {
        //       to_user_id: targetUserId,
        //       candidate,
        //     });
        //   });
        //   await sendSignaling("answer", { to_user_id: targetUserId, answer });
        //   setCallState("connected");
        //   break;
        // }

        case "WEBRTC_OFFER": {
          console.log("===== WEBRTC_OFFER =====");

          // Show the ActiveCall UI immediately
          setCallState("connected");

          const answer = await createAnswer(sseEvent.offer, (candidate) => {
            sendSignaling("ice-candidate", {
              to_user_id: targetUserId,
              candidate,
            });
          });

          console.log("Answer created");

          await sendSignaling("answer", {
            to_user_id: targetUserId,
            answer,
          });

          console.log("Answer sent");

          break;
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
          endWebRTC();
          resetCallUI();
          break;
        }

        default:
          break;
      }

      // Always clear processed event from Redux store
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
        <ActiveCall onEndWebRTC={endWebRTC} toggleMute={toggleMute} />
      ) : null}
    </>
  );
};

export default CallManager;
