import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useCall } from "../context/callContext";

const CallingScreen = () => {
  const { getToken } = useAuth();
  const { callState, remoteUser, endCall } = useCall();

  if (callState !== "calling" && callState !== "ringing") {
    return null;
  }

  const targetUserId = remoteUser?.id || remoteUser?._id;

  const cancelCall = async () => {
    try {
      const token = await getToken();
      await api.post(
        "/api/call/cancel",
        { to_user_id: targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      endCall();
      toast("Call cancelled");
    } catch (error) {
      toast.error("Failed to cancel call");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-96 rounded-3xl bg-white shadow-2xl p-8 text-center">
        <img
          src={remoteUser?.profile_picture || "https://placehold.co/120x120?text=User"}
          alt={remoteUser?.full_name}
          className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-indigo-500 shadow-lg"
        />
        <h2 className="mt-5 text-2xl font-bold text-gray-800">{remoteUser?.full_name}</h2>
        <p className="text-gray-500 mt-1">@{remoteUser?.username}</p>
        <p className="text-gray-500 mt-2">
          {callState === "calling" && "Calling..."}
          {callState === "ringing" && "🔔 Ringing..."}
        </p>
        <button
          onClick={cancelCall}
          className="mt-10 w-full rounded-xl bg-red-500 py-3 text-lg font-semibold text-white transition hover:bg-red-600 active:scale-95"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default CallingScreen;
