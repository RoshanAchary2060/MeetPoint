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

  // Remote video/audio stream
  const [remoteStream, setRemoteStream] = useState(null);

  // Local camera/microphone stream
  const [localStream, setLocalStream] = useState(null);

  // Prevent duplicate WebRTC negotiation
  const negotiationStarted = useRef(false);

  const startNegotiation = () => {
    negotiationStarted.current = true;
  };

  const isNegotiationStarted = () => {
    return negotiationStarted.current;
  };

  const resetNegotiationLock = () => {
    negotiationStarted.current = false;
  };

  /*
    WebRTC controls are registered by CallManager.
    This allows ActiveCall and other components
    to use the SAME WebRTC connection.
  */
  const webrtcControlsRef = useRef({
    endCall: () => {},
    toggleMute: () => {},
    toggleCamera: () => {},
  });

  const registerWebRTCControls = (controls) => {
    webrtcControlsRef.current = {
      ...webrtcControlsRef.current,
      ...controls,
    };
  };

  const endCall = () => {
    webrtcControlsRef.current.endCall();

    negotiationStarted.current = false;

    setRemoteUser(null);
    setRemoteStream(null);
    setLocalStream(null);

    setCallState("idle");
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        setCallState,

        remoteUser,
        setRemoteUser,

        localStream,
        setLocalStream,

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
