import { useEffect, useRef, useState } from "react";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  User,
  Move,
  Maximize2,
} from "lucide-react";

import { useCall } from "../context/callContext";
import socket from "../socket/socket";

const ActiveCall = ({
  toggleMute,
  toggleCamera,
  localVideoRef,
  remoteVideoRef,
}) => {
  const {
    callState,
    remoteUser,
    localStream,
    remoteStream,
    callType,
    endCall,
    setCallState,
    setRemoteUser,
  } = useCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // =========================================================
  // LOCAL PREVIEW POSITION + SIZE
  // =========================================================

  const [localPosition, setLocalPosition] = useState({
    x: 0,
    y: 0,
  });

  const [localSize, setLocalSize] = useState({
    width: 220,
    height: 280,
  });

  const localPreviewRef = useRef(null);

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

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
  // RESET UI
  // =========================================================

  useEffect(() => {
    if (callState !== "connected") {
      setIsMuted(false);
      setIsCameraOff(false);
      setSeconds(0);

      setLocalPosition({
        x: 0,
        y: 0,
      });

      setLocalSize({
        width: 220,
        height: 280,
      });
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
  // =========================================================

  const handleEndCall = () => {
    const targetId = remoteUser?._id || remoteUser?.id || remoteUser;

    console.log("📴 Sending END CALL signal to target ID:", targetId);

    if (targetId && socket) {
      socket.emit("end-call", {
        receiverId: targetId,
      });
    }

    // Local cleanup
    endCall();

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
  // LOCAL PREVIEW DRAG
  // =========================================================

  const handleDragStart = (event) => {
    event.preventDefault();

    const preview = localPreviewRef.current;

    if (!preview) {
      return;
    }

    const rect = preview.getBoundingClientRect();

    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };

    document.body.style.userSelect = "none";
  };

  // =========================================================
  // LOCAL PREVIEW RESIZE
  // =========================================================

  const handleResizeStart = (event) => {
    event.preventDefault();
    event.stopPropagation();

    resizeRef.current = {
      resizing: true,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: localSize.width,
      startHeight: localSize.height,
    };

    document.body.style.userSelect = "none";
  };

  // =========================================================
  // DRAG + RESIZE MOVE
  // =========================================================

  useEffect(() => {
    const handlePointerMove = (event) => {
      // =====================================================
      // DRAGGING
      // =====================================================

      if (dragRef.current.dragging) {
        const dx = event.clientX - dragRef.current.startX;

        const dy = event.clientY - dragRef.current.startY;

        const newLeft = dragRef.current.startLeft + dx;

        const newTop = dragRef.current.startTop + dy;

        const preview = localPreviewRef.current;

        if (!preview) {
          return;
        }

        const previewWidth = preview.offsetWidth;

        const previewHeight = preview.offsetHeight;

        const maxLeft = window.innerWidth - previewWidth;

        const maxTop = window.innerHeight - previewHeight;

        const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));

        const boundedTop = Math.max(0, Math.min(newTop, maxTop));

        setLocalPosition({
          x: boundedLeft,
          y: boundedTop,
        });
      }

      // =====================================================
      // RESIZING
      // =====================================================

      if (resizeRef.current.resizing) {
        const dx = event.clientX - resizeRef.current.startX;

        const dy = event.clientY - resizeRef.current.startY;

        const newWidth = Math.max(
          140,
          Math.min(resizeRef.current.startWidth + dx, 500),
        );

        const newHeight = Math.max(
          180,
          Math.min(resizeRef.current.startHeight + dy, 600),
        );

        setLocalSize({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handlePointerUp = () => {
      dragRef.current.dragging = false;
      resizeRef.current.resizing = false;

      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);

      document.body.style.userSelect = "";
    };
  }, [localSize.width, localSize.height]);

  // =========================================================
  // KEEP LOCAL PREVIEW INSIDE WINDOW AFTER RESIZE
  // =========================================================

  useEffect(() => {
    const keepInsideWindow = () => {
      const preview = localPreviewRef.current;

      if (!preview) {
        return;
      }

      const rect = preview.getBoundingClientRect();

      const maxLeft = window.innerWidth - rect.width;

      const maxTop = window.innerHeight - rect.height;

      setLocalPosition((previous) => ({
        x: Math.max(0, Math.min(previous.x, maxLeft)),
        y: Math.max(0, Math.min(previous.y, maxTop)),
      }));
    };

    window.addEventListener("resize", keepInsideWindow);

    return () => {
      window.removeEventListener("resize", keepInsideWindow);
    };
  }, []);

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
    <div className="fixed inset-0 z-[9997] bg-gray-950 text-white overflow-hidden">
      {/* =====================================================
          REMOTE VIDEO
          FIXED — NOT DRAGGABLE
          NOT RESIZABLE
      ====================================================== */}

      <div className="absolute inset-0 flex items-center justify-center bg-gray-950 pointer-events-none">
        {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls={false}
            className="
              absolute
              inset-0
              w-full
              h-full
              object-contain
              bg-black
              pointer-events-none
            "
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
              {remoteUser?.profile_picture ? (
                <img
                  src={remoteUser.profile_picture}
                  alt={remoteUser.full_name}
                  className="w-full h-full object-cover"
                  draggable={false}
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

      <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
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

          DRAGGABLE + RESIZABLE

          THIS IS THE ONLY MOVABLE VIDEO
      ====================================================== */}

      <div
        ref={localPreviewRef}
        className="fixed rounded-2xl overflow-hidden bg-gray-900 border border-white/20 shadow-2xl z-[9999]"
        style={{
          left: `${localPosition.x}px`,
          top: `${localPosition.y}px`,
          width: `${localSize.width}px`,
          height: `${localSize.height}px`,
          touchAction: "none",
        }}
      >
        {/* =================================================
            DRAG HEADER
        ================================================== */}

        <div
          onPointerDown={handleDragStart}
          className="absolute top-0 left-0 right-0 h-10 z-20 flex items-center justify-between px-3 bg-gradient-to-b from-black/70 to-transparent cursor-move"
          title="Drag your video"
        >
          <div className="flex items-center gap-1.5 text-xs text-white/80">
            <Move className="w-3.5 h-3.5" />
            <span>You</span>
          </div>
        </div>

        {/* =================================================
            LOCAL VIDEO
        ================================================== */}

        {!isCameraOff ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            controls={false}
            draggable={false}
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
              <VideoOff className="w-7 h-7 text-gray-300" />
            </div>

            <p className="text-xs text-gray-400 mt-2">Camera off</p>
          </div>
        )}

        {/* =================================================
            LOCAL LABEL
        ================================================== */}

        <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded-md pointer-events-none">
          You
        </div>

        {/* =================================================
            RESIZE HANDLE
        ================================================== */}

        <div
          onPointerDown={handleResizeStart}
          className="absolute bottom-0 right-0 z-30 w-7 h-7 cursor-nwse-resize flex items-end justify-end p-1"
          title="Resize your video"
        >
          <div className="w-4 h-4 rounded-sm bg-white/80 shadow flex items-center justify-center">
            <Maximize2 className="w-3 h-3 text-gray-800" />
          </div>
        </div>
      </div>

      {/* =====================================================
          CONTROLS
      ====================================================== */}

      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/90 to-transparent z-[10000]">
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
