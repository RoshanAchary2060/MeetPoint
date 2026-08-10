import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";

import { useCall } from "../context/callContext";
import api from "../api/axios";

const CallingScreen = ({ onCancel }) => {
  const { getToken } = useAuth();

  const { callState, remoteUser, callType } = useCall();

  if (callState !== "calling" && callState !== "ringing") {
    return null;
  }

  const targetUserId = remoteUser?.id || remoteUser?._id;

  const handleCancelCall = async () => {
    // 1. Send socket event to notify B immediately and clear local WebRTC UI
    if (onCancel) {
      onCancel();
    }

    // 2. Notify backend API
    try {
      const token = await getToken();

      if (targetUserId) {
        await api.post(
          "/api/call/cancel",
          {
            to_user_id: targetUserId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error("Cancel call error:", error);
    }

    toast("Call cancelled");
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-96 rounded-3xl bg-white shadow-2xl p-8 text-center">
        <img
          src={
            remoteUser?.profile_picture ||
            "https://placehold.co/120x120?text=User"
          }
          alt={remoteUser?.full_name || "User"}
          className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-indigo-500 shadow-lg"
        />

        <h2 className="mt-5 text-2xl font-bold text-gray-800">
          {remoteUser?.full_name}
        </h2>

        <p className="text-gray-500 mt-1">@{remoteUser?.username}</p>

        <p className="text-gray-500 mt-3">
          {callType === "video" ? "📹" : "📞"}{" "}
          {callState === "calling" ? "Calling..." : "🔔 Ringing..."}
        </p>

        <button
          onClick={handleCancelCall}
          className="mt-10 w-full rounded-xl bg-red-500 py-3 text-lg font-semibold text-white transition hover:bg-red-600 active:scale-95"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default CallingScreen;
