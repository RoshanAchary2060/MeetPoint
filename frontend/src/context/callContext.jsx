import { createContext, useContext, useRef, useState } from "react";

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
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
  const [remoteStream, setRemoteStream] = useState(null);

  // Guards against duplicate offer/answer creation (fixes "Unknown ufrag" errors)
  const negotiationStarted = useRef(false);

  const startNegotiation = () => {
    negotiationStarted.current = true;
  };

  const isNegotiationStarted = () => negotiationStarted.current;

  const resetNegotiationLock = () => {
    negotiationStarted.current = false;
  };

  // The real WebRTC controls (createOffer, createAnswer, endCall, etc.)
  // get registered here by CallManager, so every component shares the SAME connection.
  const webrtcControlsRef = useRef({
    endCall: () => {},
    toggleMute: () => {},
  });

  const registerWebRTCControls = (controls) => {
    webrtcControlsRef.current = controls;
  };

  const endCall = () => {
    webrtcControlsRef.current.endCall();
    negotiationStarted.current = false;
    setRemoteUser(null);
    setRemoteStream(null);
    setCallState("idle");
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        setCallState,
        remoteUser,
        setRemoteUser,
        remoteStream,
        setRemoteStream,
        startNegotiation,
        isNegotiationStarted,
        resetNegotiationLock,
        registerWebRTCControls,
        endCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
