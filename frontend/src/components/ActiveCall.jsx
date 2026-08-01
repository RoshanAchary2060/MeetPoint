import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useCall } from "../context/CallContext";
import api from "../api/axios";

const ActiveCall = ({ onEndWebRTC, toggleMute }) => {
  const { callState, remoteUser, endCall } = useCall();
  const { getToken } = useAuth();
  const [isMuted, setIsMuted] = useState(false);

  if (callState !== "connected") {
    return null;
  }

  const remoteUserId = remoteUser?.id || remoteUser?._id;

  const handleEndCall = async () => {
    try {
      const token = await getToken();

      await api.post(
        "/api/call/end",
        {
          to_user_id: remoteUserId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Failed to notify backend of call end:", error);
    } finally {
      // 1. Tear down WebRTC media tracks & PeerConnection
      if (onEndWebRTC) onEndWebRTC();
      // 2. Reset CallContext UI state
      endCall();
    }
  };

  const handleToggleMute = () => {
    const nextMuteState = !isMuted;
    setIsMuted(nextMuteState);
    if (toggleMute) {
      toggleMute(nextMuteState);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-80 text-center shadow-xl">
        <img
          src={remoteUser?.profile_picture || "https://via.placeholder.com/150"}
          className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-emerald-500"
          alt={remoteUser?.full_name || "User"}
        />

        <h2 className="text-xl font-bold mt-4">{remoteUser?.full_name}</h2>

        <p className="text-emerald-600 font-medium mt-2 animate-pulse">
          Connected
        </p>

        <div className="flex justify-center gap-5 mt-8">
          <button
            onClick={handleToggleMute}
            className={`rounded-full px-5 py-3 transition ${
              isMuted ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-800"
            }`}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>

          <button
            onClick={handleEndCall}
            className="bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-full px-6 py-3 transition shadow-md"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCall;
