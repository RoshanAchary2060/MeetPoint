import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Grip } from "lucide-react";

const ActiveCall = ({
  toggleMute,
  toggleCamera,
  localVideoRef,
  remoteVideoRef,
  callType = "audio",
}) => {
  // =========================================================
  // TIMER
  // =========================================================

  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");

    const secs = (seconds % 60).toString().padStart(2, "0");

    return `${minutes}:${secs}`;
  };

  // =========================================================
  // STATE
  // =========================================================

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  // =========================================================
  // VIDEO STAGE
  // =========================================================

  const stageRef = useRef(null);
  const localContainerRef = useRef(null);

  // =========================================================
  // LOCAL VIDEO POSITION
  // =========================================================

  const [localPosition, setLocalPosition] = useState({
    x: 24,
    y: 24,
  });

  // =========================================================
  // LOCAL VIDEO SIZE
  // =========================================================

  const [localSize, setLocalSize] = useState({
    width: 240,
    height: 150,
  });

  // =========================================================
  // DRAGGING
  // =========================================================

  const dragRef = useRef({
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  // =========================================================
  // RESIZING
  // =========================================================

  const resizeRef = useRef({
    resizing: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // =========================================================
  // DRAG START
  // =========================================================

  const handleDragStart = (e) => {
    // Don't start dragging when resizing.
    if (e.target.dataset.resizeHandle === "true") {
      return;
    }

    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    dragRef.current = {
      dragging: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: localPosition.x,
      startTop: localPosition.y,
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);

    e.preventDefault();
  };

  // =========================================================
  // DRAG MOVE
  // =========================================================

  const handleDragMove = (e) => {
    if (!dragRef.current.dragging) {
      return;
    }

    if (e.pointerId !== dragRef.current.pointerId) {
      return;
    }

    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();

    const deltaX = e.clientX - dragRef.current.startX;

    const deltaY = e.clientY - dragRef.current.startY;

    let newX = dragRef.current.startLeft + deltaX;

    let newY = dragRef.current.startTop + deltaY;

    // -------------------------------------------------------
    // Keep local video inside stage
    // -------------------------------------------------------

    const maxX = stageRect.width - localSize.width;

    const maxY = stageRect.height - localSize.height;

    newX = Math.max(0, Math.min(newX, maxX));

    newY = Math.max(0, Math.min(newY, maxY));

    setLocalPosition({
      x: newX,
      y: newY,
    });
  };

  // =========================================================
  // DRAG END
  // =========================================================

  const handleDragEnd = (e) => {
    if (
      dragRef.current.pointerId !== null &&
      e.pointerId !== dragRef.current.pointerId
    ) {
      return;
    }

    dragRef.current.dragging = false;
    dragRef.current.pointerId = null;
  };

  // =========================================================
  // RESIZE START
  // =========================================================

  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();

    resizeRef.current = {
      resizing: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: localSize.width,
      startHeight: localSize.height,
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  // =========================================================
  // RESIZE MOVE
  // =========================================================

  const handleResizeMove = (e) => {
    if (!resizeRef.current.resizing) {
      return;
    }

    if (e.pointerId !== resizeRef.current.pointerId) {
      return;
    }

    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();

    const deltaX = e.clientX - resizeRef.current.startX;

    const deltaY = e.clientY - resizeRef.current.startY;

    // -------------------------------------------------------
    // Maintain approximately 16:10 aspect ratio
    // -------------------------------------------------------

    const aspectRatio =
      resizeRef.current.startWidth / resizeRef.current.startHeight;

    let newWidth = resizeRef.current.startWidth + deltaX;

    let newHeight = newWidth / aspectRatio;

    // -------------------------------------------------------
    // Minimum size
    // -------------------------------------------------------

    const minWidth = 140;
    const minHeight = 90;

    newWidth = Math.max(minWidth, newWidth);

    newHeight = Math.max(minHeight, newHeight);

    // -------------------------------------------------------
    // Maximum size
    // -------------------------------------------------------

    const maxWidth = stageRect.width * 0.55;

    const maxHeight = stageRect.height * 0.55;

    newWidth = Math.min(newWidth, maxWidth);

    newHeight = Math.min(newHeight, maxHeight);

    // -------------------------------------------------------
    // Don't allow the card to go outside stage
    // -------------------------------------------------------

    const maxX = stageRect.width - newWidth;

    const maxY = stageRect.height - newHeight;

    setLocalPosition((prev) => ({
      x: Math.min(prev.x, Math.max(0, maxX)),
      y: Math.min(prev.y, Math.max(0, maxY)),
    }));

    setLocalSize({
      width: newWidth,
      height: newHeight,
    });
  };

  // =========================================================
  // RESIZE END
  // =========================================================

  const handleResizeEnd = (e) => {
    if (
      resizeRef.current.pointerId !== null &&
      e.pointerId !== resizeRef.current.pointerId
    ) {
      return;
    }

    resizeRef.current.resizing = false;
    resizeRef.current.pointerId = null;
  };

  // =========================================================
  // MUTE
  // =========================================================

  const handleMute = () => {
    toggleMute?.();

    setMuted((prev) => !prev);
  };

  // =========================================================
  // CAMERA
  // =========================================================

  const handleCamera = () => {
    toggleCamera?.();

    setCameraOff((prev) => !prev);
  };

  // =========================================================
  // AUDIO CALL
  // =========================================================

  if (callType === "audio") {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#020617] text-white flex flex-col">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="absolute top-6 left-6 z-20">
          <h2 className="text-lg font-semibold">Active Call</h2>

          <p className="text-sm text-gray-400">Connected • {formatTime()}</p>
        </div>

        {/* =================================================
            AUDIO AREA
        ================================================= */}

        <div className="flex-1 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl">
              🎧
            </div>
          </div>
        </div>

        {/* =================================================
            CONTROLS
        ================================================= */}

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-5">
          <button
            onClick={handleMute}
            className={`
              w-14
              h-14
              rounded-full
              flex
              items-center
              justify-center
              transition
              ${muted ? "bg-white text-black" : "bg-gray-800 hover:bg-gray-700"}
            `}
          >
            {muted ? <MicOff size={23} /> : <Mic size={23} />}
          </button>

          <button
            onClick={handleCamera}
            className={`
              w-14
              h-14
              rounded-full
              flex
              items-center
              justify-center
              transition
              ${
                cameraOff
                  ? "bg-white text-black"
                  : "bg-gray-800 hover:bg-gray-700"
              }
            `}
          >
            {cameraOff ? <VideoOff size={23} /> : <Video size={23} />}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIDEO CALL
  // =========================================================

  return (
    <div
      ref={stageRef}
      className="
        fixed
        inset-0
        z-[9999]
        bg-black
        overflow-hidden
        select-none
      "
    >
      {/* =====================================================
          REMOTE VIDEO — LARGE / FIXED
      ===================================================== */}

      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
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

      {/* =====================================================
          TOP LEFT INFORMATION
      ===================================================== */}

      <div
        className="
          absolute
          top-6
          left-6
          z-30
          pointer-events-none
        "
      >
        <h2 className="text-lg font-semibold text-white">Active Call</h2>

        <p className="text-sm text-gray-300">Connected • {formatTime()}</p>
      </div>

      {/* =====================================================
          SMALL LOCAL VIDEO

          THIS IS THE ONLY MOVABLE / RESIZABLE ELEMENT
      ===================================================== */}

      <div
        ref={localContainerRef}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{
          width: `${localSize.width}px`,
          height: `${localSize.height}px`,
          transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
          touchAction: "none",
        }}
        className="
          absolute
          top-0
          left-0
          z-40
          rounded-2xl
          overflow-hidden
          bg-gray-900
          border
          border-white/20
          shadow-2xl
          cursor-grab
          active:cursor-grabbing
        "
      >
        {/* ===================================================
            LOCAL VIDEO
        =================================================== */}

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          className="
            w-full
            h-full
            object-cover
            pointer-events-none
          "
        />

        {/* ===================================================
            YOU LABEL
        =================================================== */}

        <div
          className="
            absolute
            bottom-2
            left-2
            px-2
            py-1
            rounded-md
            bg-black/60
            text-white
            text-[11px]
            font-medium
            pointer-events-none
          "
        >
          You
        </div>

        {/* ===================================================
            DRAG INDICATOR
        =================================================== */}

        <div
          className="
            absolute
            top-2
            left-1/2
            -translate-x-1/2
            text-white/50
            pointer-events-none
          "
        >
          <Grip size={18} />
        </div>

        {/* ===================================================
            RESIZE HANDLE

            THIS CORNER RESIZES THE SMALL VIDEO
            WITHOUT POPPING IT OUT.
        =================================================== */}

        <div
          data-resize-handle="true"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          style={{
            touchAction: "none",
          }}
          className="
            absolute
            right-0
            bottom-0
            w-7
            h-7
            cursor-nwse-resize
            z-50
          "
        >
          <div
            className="
              absolute
              right-1
              bottom-1
              w-3
              h-3
              border-r-2
              border-b-2
              border-white/80
              rounded-br-sm
            "
          />
        </div>
      </div>

      {/* =====================================================
          BOTTOM CONTROLS
      ===================================================== */}

      <div
        className="
          absolute
          bottom-8
          left-1/2
          -translate-x-1/2
          z-50
          flex
          items-center
          gap-4
        "
      >
        {/* ===================================================
            MICROPHONE
        =================================================== */}

        <button
          onClick={handleMute}
          className={`
            w-14
            h-14
            rounded-full
            flex
            items-center
            justify-center
            transition-all
            shadow-lg
            ${
              muted
                ? "bg-white text-black"
                : "bg-gray-800/90 text-white hover:bg-gray-700"
            }
          `}
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* ===================================================
            CAMERA
        =================================================== */}

        <button
          onClick={handleCamera}
          className={`
            w-14
            h-14
            rounded-full
            flex
            items-center
            justify-center
            transition-all
            shadow-lg
            ${
              cameraOff
                ? "bg-white text-black"
                : "bg-gray-800/90 text-white hover:bg-gray-700"
            }
          `}
        >
          {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>

        {/* ===================================================
            END CALL

            IMPORTANT:
            We intentionally don't implement call ending here.

            CallManager's registered endCall handler remains
            responsible for ending WebRTC + notifying the
            other user.
        =================================================== */}
      </div>
    </div>
  );
};

export default ActiveCall;
