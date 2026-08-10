import {
  createContext,
  useContext,
  useRef,
  useState,
} from "react";

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
  */

  const [remoteUser, setRemoteUser] = useState(null);

  const [remoteStream, setRemoteStream] =
    useState(null);

  const [localStream, setLocalStream] =
    useState(null);

  const [callType, setCallType] =
    useState(null);

  // ==================================================
  // NEGOTIATION LOCK
  // ==================================================

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

  // ==================================================
  // WEBRTC CONTROLS
  // ==================================================

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

  // ==================================================
  // RESET CALL UI
  // ==================================================

  const resetCall = () => {
    negotiationStarted.current = false;

    setRemoteUser(null);
    setRemoteStream(null);
    setLocalStream(null);
    setCallType(null);
    setCallState("idle");
  };

  // ==================================================
  // END CALL
  // ==================================================

  const endCall = () => {
    webrtcControlsRef.current.endCall();

    resetCall();
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

        callType,
        setCallType,

        startNegotiation,
        isNegotiationStarted,
        resetNegotiationLock,

        registerWebRTCControls,

        resetCall,
        endCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
