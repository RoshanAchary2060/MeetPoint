import { createContext, useContext, useRef, useState } from "react";

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const [callState, setCallState] = useState("idle");
  /*
    idle
    calling
    ringing
    incoming
    connected
    ended
  */

  const [remoteUser, setRemoteUser] = useState(null);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"],
        },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE Candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    peerConnection.current = pc;
    return pc;
  };

  const startLocalAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    localStream.current = stream;

    if (peerConnection.current) {
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    }
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    setRemoteUser(null);
    setCallState("idle");
  };

  return (
    <CallContext.Provider
      value={{
        peerConnection,
        localStream,

        callState,
        setCallState,

        remoteUser,
        setRemoteUser,

        createPeerConnection,
        startLocalAudio,
        endCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
