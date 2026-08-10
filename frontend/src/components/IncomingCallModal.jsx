import { useEffect } from "react";
import toast from "react-hot-toast";
import { useCall } from "../context/callContext.jsx";
import socket from "../socket/socket";

const IncomingCallModal = () => {
  const {
    callState,
    remoteUser,
    callType,
    setCallState,
    endCall,
  } = useCall();

  const callerId =
    remoteUser?.id ||
    remoteUser?._id;

  // =========================================================
  // CALL RINGING
  // =========================================================

  useEffect(() => {
    if (
      callState === "incoming" &&
      callerId &&
      socket
    ) {
      console.log(
        "🔔 INCOMING SCREEN VISIBLE",
      );

      console.log(
        "📤 Sending call-ringing to:",
        callerId,
      );

      socket.emit("call-ringing", {
        callerId,
      });
    }
  }, [callState, callerId]);

  // =========================================================
  // ACCEPT
  // =========================================================

  const acceptCall = () => {
    if (!callerId) {
      console.error(
        "❌ Cannot accept call. Missing callerId:",
        remoteUser,
      );

      toast.error(
        "Call is no longer available",
      );

      endCall();

      return;
    }

    console.log(
      "✅ ACCEPTING CALL",
      {
        callerId,
        callType,
      },
    );

    socket.emit("accept-call", {
      callerId,
      callType,
    });

    /*
     * We don't go directly to connected.
     *
     * Caller will create the WebRTC offer.
     */

    setCallState("ringing");
  };

  // =========================================================
  // REJECT
  // =========================================================

  const rejectCall = () => {
    console.log(
      "❌ REJECTING CALL",
    );

    if (callerId) {
      socket.emit("reject-call", {
        callerId,
      });
    }

    /*
     * Local UI closes immediately.
     */

    endCall();
  };

  // =========================================================
  // DO NOT RENDER
  // =========================================================

  if (callState !== "incoming") {
    return null;
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[380px] rounded-2xl bg-white p-8 shadow-2xl">

        <img
          src={
            remoteUser?.profile_picture ||
            "https://placehold.co/120x120?text=User"
          }
          alt={
            remoteUser?.full_name ||
            "User"
          }
          className="
            w-28
            h-28
            rounded-full
            object-cover
            mx-auto
            border-4
            border-indigo-500
            shadow-lg
          "
        />

        <h2 className="mt-5 text-center text-2xl font-bold text-gray-800">
          {remoteUser?.full_name ||
            "MeetPoint User"}
        </h2>

        <p className="text-center text-gray-500 mt-1">
          @{remoteUser?.username || "user"}
        </p>

        <p className="text-center text-indigo-600 font-medium mt-5">
          {callType === "video"
            ? "🎥 Incoming Video Call"
            : "📞 Incoming Audio Call"}
        </p>

        <div className="flex gap-4 mt-8">

          <button
            onClick={rejectCall}
            className="
              flex-1
              rounded-xl
              bg-red-500
              py-3
              text-white
              font-semibold
              hover:bg-red-600
              transition
              active:scale-95
            "
          >
            Decline
          </button>

          <button
            onClick={acceptCall}
            className="
              flex-1
              rounded-xl
              bg-green-500
              py-3
              text-white
              font-semibold
              hover:bg-green-600
              transition
              active:scale-95
            "
          >
            Accept
          </button>

        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
