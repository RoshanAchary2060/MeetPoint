import { useEffect, useState } from "react";

import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from "lucide-react";

import { useAuth } from "@clerk/clerk-react";

import { useCall } from "../context/callContext";
import api from "../api/axios";
import socket from "../socket/socket";
import toast from "react-hot-toast";

const ActiveCall = ({
  toggleMute,
  toggleCamera,
  localVideoRef,
  remoteVideoRef,
}) => {
  const { getToken } = useAuth();

  const {
      callState,
      remoteUser,
      localStream,
      remoteStream,
      callType,
      endCall,
      setCallState,   // 👈 Add this
      setRemoteUser,  // 👈 Add this
    } = useCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    if (callState !== "connected") {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState]);

  // =========================================================
  // RESET LOCAL UI WHEN CALL ENDS
  // =========================================================

  useEffect(() => {
    if (callState !== "connected") {
      setIsMuted(false);
      setIsCameraOff(false);
      setSeconds(0);
    }
  }, [callState]);

  // =========================================================
  // LOCAL VIDEO
  // =========================================================

  useEffect(() => {
    if (callType !== "video" || !localVideoRef?.current || !localStream) {
      return;
    }

    const video = localVideoRef.current;

    if (video.srcObject !== localStream) {
      video.srcObject = localStream;
    }

    video.play().catch((error) => {
      console.log("Local video autoplay prevented:", error);
    });

    return () => {
      if (video.srcObject === localStream) {
        video.srcObject = null;
      }
    };
  }, [callType, localStream, localVideoRef]);

  // =========================================================
  // REMOTE VIDEO
  // =========================================================

  useEffect(() => {
    if (callType !== "video" || !remoteVideoRef?.current || !remoteStream) {
      return;
    }

    const video = remoteVideoRef.current;

    if (video.srcObject !== remoteStream) {
      video.srcObject = remoteStream;
    }

    video.play().catch((error) => {
      console.log("Remote video autoplay prevented:", error);
    });

    return () => {
      if (video.srcObject === remoteStream) {
        video.srcObject = null;
      }
    };
  }, [callType, remoteStream, remoteVideoRef]);

  // =========================================================
  // TIMER FORMAT
  // =========================================================

  const formatTime = () => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  };

  // =========================================================
  // END CALL
  //
  // IMPORTANT:
  // 1. Tell backend that this user ended the call.
  // 2. Backend/socket notifies the other user.
  // 3. Locally clean WebRTC + call state.
  //
  // This works for BOTH audio and video.
  // =========================================================

  // Inside ActiveCall.jsx
  const handleEndCall = () => {
    // Extract target ID safely
    const targetId = remoteUser?._id || remoteUser?.id || remoteUser;

    console.log("📴 Sending END CALL signal to target ID:", targetId);

    if (targetId && socket) {
      socket.emit("end-call", { receiverId: targetId });
    } else {
      console.warn(
        "⚠️ Could not send end-call signal: targetId or socket missing",
        { targetId, socket },
      );
    }

    // Local cleanup
    endCall(); // Calls useWebRTC cleanup
    setCallState("idle");
    setRemoteUser(null);
  };

  // =========================================================
  // MUTE
  // =========================================================

  const handleToggleMute = () => {
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    toggleMute?.(nextMuted);
  };

  // =========================================================
  // CAMERA
  // =========================================================

  const handleToggleCamera = () => {
    if (callType !== "video") {
      return;
    }

    const nextCameraOff = !isCameraOff;

    setIsCameraOff(nextCameraOff);

    toggleCamera?.(nextCameraOff);
  };

  // =========================================================
  // NOT ACTIVE
  // =========================================================

  if (callState !== "connected") {
    return null;
  }

  // =========================================================
  // AUDIO CALL UI
  // =========================================================

  if (callType === "audio") {
    return (
      <div className="fixed inset-0 z-[9997] bg-gray-950 text-white flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          {/* PROFILE */}

          <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-white/10">
            {remoteUser?.profile_picture ? (
              <img
                src={remoteUser.profile_picture}
                alt={remoteUser.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-14 h-14 text-gray-400" />
            )}
          </div>

          {/* NAME */}

          <h2 className="mt-6 text-2xl font-semibold">
            {remoteUser?.full_name || "MeetPoint User"}
          </h2>

          {/* TIMER */}

          <p className="text-gray-400 mt-2">Connected • {formatTime()}</p>

          {/* CONTROLS */}

          <div className="mt-10 flex items-center gap-4">
            {/* MUTE */}

            <button
              onClick={handleToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isMuted ? "bg-red-500" : "bg-white/15"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </button>

            {/* END CALL */}

            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
              title="End call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIDEO CALL UI
  // =========================================================

  return (
    <div className="fixed inset-0 z-[9997] bg-gray-950 text-white">
      {/* =====================================================
          REMOTE VIDEO
      ====================================================== */}

      <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
        {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
              {remoteUser?.profile_picture ? (
                <img
                  src={remoteUser.profile_picture}
                  alt={remoteUser.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>

            <p className="mt-5 text-xl font-semibold">
              {remoteUser?.full_name || "User"}
            </p>

            <p className="text-sm text-gray-400 mt-1">Camera unavailable</p>
          </div>
        )}
      </div>

      {/* =====================================================
          TOP INFO
      ====================================================== */}

      <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">
              {remoteUser?.full_name || "MeetPoint User"}
            </h2>

            <p className="text-sm text-gray-300">Connected • {formatTime()}</p>
          </div>

          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs">
            MeetPoint
          </div>
        </div>
      </div>

      {/* =====================================================
          LOCAL PREVIEW
      ====================================================== */}

      <div className="absolute right-4 top-20 w-32 h-44 sm:w-44 sm:h-56 md:w-52 md:h-64 rounded-2xl overflow-hidden bg-gray-900 border border-white/20 shadow-2xl">
        {!isCameraOff ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
              <VideoOff className="w-7 h-7 text-gray-300" />
            </div>

            <p className="text-xs text-gray-400 mt-2">Camera off</p>
          </div>
        )}

        <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded-md">
          You
        </div>
      </div>

      {/* =====================================================
          CONTROLS
      ====================================================== */}

      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex justify-center items-center gap-4">
          {/* MUTE */}

          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isMuted ? "bg-red-500" : "bg-white/15 backdrop-blur-md"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </button>

          {/* CAMERA */}

          <button
            onClick={handleToggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isCameraOff ? "bg-red-500" : "bg-white/15 backdrop-blur-md"
            }`}
            title={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? <VideoOff /> : <Video />}
          </button>

          {/* END CALL */}

          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
            title="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCall;
