import { useState, useEffect } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useCall } from "../context/callContext";
import api from "../api/axios";

const ActiveCall = ({ onEndWebRTC, toggleMute }) => {
  const { callState, remoteUser, endCall } = useCall();
  const { getToken } = useAuth();

  const [isMuted, setIsMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (callState !== "connected") return null;

  const remoteUserId = remoteUser?.id || remoteUser?._id;

  const handleEndCall = async () => {


   // 1. Immediately kill UI + WebRTC

   if(onEndWebRTC)
      onEndWebRTC();

   endCall();



   // 2. Notify backend silently

   try{

     const token = await getToken();


     await api.post(
       "/api/call/end",
       {
         to_user_id: remoteUserId
       },
       {
         headers:{
           Authorization:`Bearer ${token}`
         }
       }
     );


   }catch(error){

     console.log(
      "Backend call cleanup failed",
      error
     );

   }


  };
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    toggleMute?.(next);
  };

  const formatTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[999] bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex flex-col items-center justify-center overflow-hidden">

      {/* Background Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl scale-125 opacity-20"
        style={{
          backgroundImage: `url(${remoteUser?.profile_picture})`,
        }}
      />

      {/* Avatar */}
      <div className="relative z-10">

        <div className="absolute inset-0 rounded-full animate-ping bg-green-500 opacity-20"></div>

        <img
          src={remoteUser?.profile_picture}
          className="relative w-40 h-40 rounded-full object-cover border-[6px] border-white shadow-2xl"
        />
      </div>

      {/* Name */}

      <h1 className="z-10 mt-8 text-4xl text-white font-bold">
        {remoteUser?.full_name}
      </h1>

      <p className="z-10 text-slate-300 mt-2">
        @{remoteUser?.username}
      </p>

      <div className="z-10 mt-6 flex items-center gap-2">

        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>

        <span className="text-green-300 font-medium">
          Connected • {formatTime()}
        </span>

      </div>

      {/* Controls */}

      <div className="absolute bottom-16 flex gap-10 z-10">

        <button
          onClick={handleToggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition duration-300 shadow-xl
            ${
              isMuted
                ? "bg-red-500 hover:bg-red-600"
                : "bg-white/15 backdrop-blur-lg hover:bg-white/25"
            }`}
        >
          {isMuted ? (
            <MicOff className="text-white" size={28} />
          ) : (
            <Mic className="text-white" size={28} />
          )}
        </button>

        <button
          onClick={handleEndCall}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition flex items-center justify-center shadow-2xl"
        >
          <PhoneOff
            className="text-white"
            size={34}
          />
        </button>

      </div>
    </div>
  );
};

export default ActiveCall;
