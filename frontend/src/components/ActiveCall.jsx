import { useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  User,
} from "lucide-react";

import { useCall } from "../context/callContext";
import socket from "../socket/socket";

const ActiveCall = ({ toggleMute, toggleCamera, localVideoRef, remoteVideoRef }) => {
  const {
    callState,
    remoteUser,
    localStream,
    remoteStream,
    endCall,
  } = useCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // --------------------------------------------------
  // CALL TIMER
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ATTACH LOCAL STREAM
  // --------------------------------------------------

  useEffect(() => {
    if (!localVideoRef?.current || !localStream) return;

    localVideoRef.current.srcObject = localStream;

    localVideoRef.current
      .play()
      .catch((error) => {
        console.log("Local video autoplay prevented:", error);
      });
  }, [localStream, localVideoRef]);

  // --------------------------------------------------
  // ATTACH REMOTE STREAM
  // --------------------------------------------------

  useEffect(() => {
    if (!remoteVideoRef?.current || !remoteStream) return;

    remoteVideoRef.current.srcObject = remoteStream;

    remoteVideoRef.current
      .play()
      .catch((error) => {
        console.log("Remote video autoplay prevented:", error);
      });
  }, [remoteStream, remoteVideoRef]);

  // --------------------------------------------------
  // FORMAT TIMER
  // --------------------------------------------------

  const formatTime = () => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  };

  // --------------------------------------------------
  // END CALL
  // --------------------------------------------------

  const handleEndCall = () => {
    const remoteUserId = remoteUser?.id || remoteUser?._id;

    if (remoteUserId) {
      socket.emit("end-call", {
        receiverId: remoteUserId,
      });
    }

    endCall();
  };

  // --------------------------------------------------
  // MUTE
  // --------------------------------------------------

  const handleToggleMute = () => {
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    toggleMute?.(nextMuted);
  };

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  const handleToggleCamera = () => {
    const nextCameraOff = !isCameraOff;

    setIsCameraOff(nextCameraOff);

    toggleCamera?.(nextCameraOff);
  };

  // --------------------------------------------------
  // DON'T RENDER WHEN NOT CONNECTED
  // --------------------------------------------------

  if (callState !== "connected") {
    return null;
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white overflow-hidden">
      {/* ------------------------------------------------
          REMOTE VIDEO
      ------------------------------------------------ */}

      <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
        {remoteStream ? (
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

            <p className="text-sm text-gray-400 mt-1">
              Connecting...
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------
          TOP INFORMATION
      ------------------------------------------------ */}

      <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">
              {remoteUser?.full_name || "MeetPoint User"}
            </h2>

            <p className="text-sm text-gray-300">
              Connected • {formatTime()}
            </p>
          </div>

          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs">
            MeetPoint
          </div>
        </div>
      </div>

      {/* ------------------------------------------------
          LOCAL VIDEO PREVIEW
      ------------------------------------------------ */}

      <div
        className="
          absolute
          right-4
          top-20
          w-32
          h-44
          sm:w-44
          sm:h-56
          md:w-52
          md:h-64
          rounded-2xl
          overflow-hidden
          bg-gray-900
          border
          border-white/20
          shadow-2xl
        "
      >
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

            <p className="text-xs text-gray-400 mt-2">
              Camera off
            </p>
          </div>
        )}

        <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded-md">
          You
        </div>
      </div>

      {/* ------------------------------------------------
          CONTROLS
      ------------------------------------------------ */}

      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex justify-center items-center gap-4">
          {/* MUTE */}

          <button
            onClick={handleToggleMute}
            className={`
              w-14
              h-14
              rounded-full
              flex
              items-center
              justify-center
              transition
              shadow-lg
              ${
                isMuted
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
              }
            `}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* CAMERA */}

          <button
            onClick={handleToggleCamera}
            className={`
              w-14
              h-14
              rounded-full
              flex
              items-center
              justify-center
              transition
              shadow-lg
              ${
                isCameraOff
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
              }
            `}
            title={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? (
              <VideoOff className="w-6 h-6" />
            ) : (
              <Video className="w-6 h-6" />
            )}
          </button>

          {/* END CALL */}

          <button
            onClick={handleEndCall}
            className="
              w-16
              h-16
              rounded-full
              bg-red-600
              hover:bg-red-700
              flex
              items-center
              justify-center
              transition
              shadow-xl
            "
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
