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

  if (callState !== "incoming") {
    return null;
  }

  const callerId =
    remoteUser?.id ||
    remoteUser?._id;

  const acceptCall = () => {
    if (!callerId) {
      console.error(
        "❌ Cannot accept call. Missing callerId:",
        remoteUser
      );

      toast.error("Call no longer available");
      endCall();
      return;
    }

    console.log(
      "✅ ACCEPTING CALL",
      {
        callerId,
        callType,
      }
    );

    socket.emit("accept-call", {
      callerId,
      callType,
    });

    /*
     * Receiver is now waiting for caller's OFFER.
     *
     * DO NOT set connected here.
     * DO NOT create offer here.
     */

    setCallState("ringing");
  };

  const rejectCall = () => {
    if (callerId) {
      socket.emit("reject-call", {
        callerId,
      });
    }

    endCall();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">

      <div className="w-96 rounded-3xl bg-white shadow-2xl p-8 text-center">

        <img
          src={
            remoteUser?.profile_picture ||
            "https://placehold.co/120x120?text=User"
          }
          alt={
            remoteUser?.full_name ||
            "User"
          }
          className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-indigo-500 shadow-lg"
        />

        <h2 className="mt-5 text-2xl font-bold text-gray-800">
          {remoteUser?.full_name ||
            "MeetPoint User"}
        </h2>

        <p className="text-gray-500 mt-1">
          @{remoteUser?.username || "user"}
        </p>

        <p className="text-indigo-600 font-medium mt-5">
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
