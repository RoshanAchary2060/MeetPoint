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
  */

  const [remoteUser, setRemoteUser] = useState(null);

  const [remoteStream, setRemoteStream] = useState(null);

  const [localStream, setLocalStream] = useState(null);

  const [callType, setCallType] = useState(null);

  // =========================================================
  // NEGOTIATION LOCK
  // =========================================================

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

  // =========================================================
  // WEBRTC CONTROLS
  // =========================================================

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

  // =========================================================
  // RESET CALL
  // =========================================================
  //
  // THIS FUNCTION ONLY RESETS REACT CALL STATE.
  //
  // It does NOT call WebRTC.
  // It does NOT emit socket events.
  //
  // This is important for remote events.
  // =========================================================

  const resetCall = () => {
    console.log("🧹 RESETTING CALL CONTEXT");

    negotiationStarted.current = false;

    setRemoteUser(null);
    setRemoteStream(null);
    setLocalStream(null);
    setCallType(null);
    setCallState("idle");
  };

  // =========================================================
  // END CALL LOCALLY
  // =========================================================
  //
  // This is used when the LOCAL user presses End Call.
  //
  // WebRTC cleanup happens here.
  // UI state is then reset.
  // =========================================================

  const endCall = () => {
    console.log("📴 LOCAL END CALL");

    try {
      webrtcControlsRef.current.endCall();
    } catch (error) {
      console.error("❌ WebRTC cleanup failed:", error);
    }

    resetCall();
  };

  return (
    <CallContext.Provider
      value={{
        // =====================================================
        // STATE
        // =====================================================

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

        // =====================================================
        // NEGOTIATION
        // =====================================================

        startNegotiation,
        isNegotiationStarted,
        resetNegotiationLock,

        // =====================================================
        // WEBRTC
        // =====================================================

        registerWebRTCControls,

        // =====================================================
        // CALL CONTROL
        // =====================================================

        resetCall,
        endCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
