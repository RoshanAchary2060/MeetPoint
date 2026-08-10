import { useState, useRef } from "react";

const ActiveCall = ({
  toggleMute,
  toggleCamera,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
  isMuted,
  isCameraOff,
}) => {
  // 💡 State & Refs for internal PIP video dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle Drag Start (Mouse & Touch)
  const handleDragStart = (e) => {
    isDragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStart.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  // Handle Dragging
  const handleDragMove = (e) => {
    if (!isDragging.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;

    setPosition({ x: newX, y: newY });
  };

  // Handle Drag End
  const handleDragEnd = () => {
    isDragging.current = false;
  };

  return (
    <div
      className="relative w-full h-screen bg-gray-950 overflow-hidden flex items-center justify-center select-none"
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      {/* Remote Main Video Stream */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
      />

      {/* 💡 Movable Initial In-App PIP Overlay */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
        className="absolute top-12 right-12 z-50 w-48 h-32 md:w-56 md:h-36 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-grab active:cursor-grabbing touch-none transition-shadow hover:border-indigo-500/50"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Drag Indicator Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/40 rounded-full pointer-events-none" />
      </div>

      {/* Call Controls Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur-lg px-6 py-3 rounded-full border border-white/10 z-40 shadow-xl">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full text-white transition active:scale-95 ${
            isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full text-white transition active:scale-95 ${
            isCameraOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {isCameraOff ? "📷❌" : "📷"}
        </button>

        <button
          onClick={onEndCall}
          className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition active:scale-95"
        >
          📞
        </button>
      </div>
    </div>
  );
};

export default ActiveCall;
