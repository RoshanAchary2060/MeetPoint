import { useState, useRef } from "react";

const ActiveCall = ({
  toggleMute,
  toggleCamera,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
}) => {
  // 💡 Dragging State for Local Video Overlay
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Position relative to bottom/right
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Mouse / Touch Start
  const handleDragStart = (e) => {
    isDragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStart.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  // Mouse / Touch Move
  const handleDragMove = (e) => {
    if (!isDragging.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;

    setPosition({ x: newX, y: newY });
  };

  // Mouse / Touch End
  const handleDragEnd = () => {
    isDragging.current = false;
  };

  return (
    <div
      className="relative w-full h-screen bg-gray-900 overflow-hidden flex items-center justify-center"
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      {/* 📹 Remote Video Feed (Full Screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
      />

      {/* 📹 Movable Local Video Feed */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        className="absolute top-4 left-4 z-50 w-32 h-48 md:w-40 md:h-56 bg-black rounded-2xl overflow-hidden border-2 border-white/50 shadow-2xl cursor-grab active:cursor-grabbing touch-none select-none transition-shadow hover:shadow-indigo-500/20"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>

      {/* 🎛️ Call Controls Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-800/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 z-40">
        {/* Toggle Mute Button */}
        <button
          onClick={toggleMute}
          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition active:scale-95"
        >
          🎤
        </button>

        {/* Toggle Camera Button */}
        <button
          onClick={toggleCamera}
          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition active:scale-95"
        >
          📷
        </button>

        {/* Hangup Button */}
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
