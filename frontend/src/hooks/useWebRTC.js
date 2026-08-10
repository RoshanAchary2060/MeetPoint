import { useRef, useState, useCallback } from "react";

import { useCall } from "../context/callContext";


let cachedServers = null;

// =========================================================
// ICE SERVERS
// =========================================================

const getIceServers = async () => {
  if (cachedServers) {
    return cachedServers;
  }

  try {
    const res = await fetch(
      `${import.meta.env.VITE_BASEURL}/api/turn-credentials`,
    );

    const data = await res.json();

    if (data.success && Array.isArray(data.iceServers)) {
      cachedServers = {
        iceServers: data.iceServers,
      };
    } else {
      throw new Error("Invalid TURN credentials");
    }
  } catch (error) {
    console.error("TURN failed, using STUN:", error);

    cachedServers = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };
  }

  return cachedServers;
};

// =========================================================
// HOOK
// =========================================================

const useWebRTC = () => {
  const peerConnection = useRef(null);

  const localStream = useRef(null);

  const remoteStream = useRef(null);

  const localVideoRef = useRef(null);

  const remoteVideoRef = useRef(null);

  const remoteAudioRef = useRef(null);

  const iceCandidatesQueue = useRef([]);

  const [isCallActive, setIsCallActive] = useState(false);

  const [isMuted, setIsMuted] = useState(false);

  const [isCameraOn, setIsCameraOn] = useState(true);

  const { callType, setCallState, setLocalStream, setRemoteStream } = useCall();

  // =========================================================
  // LOCAL VIDEO
  // =========================================================

  const attachLocalVideo = useCallback(() => {
    if (!localVideoRef.current || !localStream.current) {
      return;
    }

    const video = localVideoRef.current;

    if (video.srcObject !== localStream.current) {
      video.srcObject = localStream.current;
    }

    video.play().catch(() => {});
  }, []);

  // =========================================================
  // REMOTE VIDEO
  // =========================================================

  const attachRemoteVideo = useCallback(() => {
    if (!remoteVideoRef.current || !remoteStream.current) {
      return;
    }

    const video = remoteVideoRef.current;

    if (video.srcObject !== remoteStream.current) {
      video.srcObject = remoteStream.current;
    }

    video.play().catch(() => {});
  }, []);

  // =========================================================
  // CLEANUP
  // =========================================================

  // Inside cleanup() in useWebRTC.js
  const cleanup = useCallback(() => {
    console.log("🧹 CLEANING WEBRTC");

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    remoteStream.current = null;
    iceCandidatesQueue.current = [];

    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setIsMuted(false);
    setIsCameraOn(true);

    // 💡 CRITICAL: Reset call state so UI closes!
    setCallState("idle");
  }, [setLocalStream, setRemoteStream, setCallState]);

  // =========================================================
  // LOCAL MEDIA
  // =========================================================

  const startLocalStream = async () => {
    try {
      if (localStream.current) {
        return localStream.current;
      }

      console.log("📞 MEDIA CALL TYPE:", callType);

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },

        video:
          callType === "video"
            ? {
                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },

                facingMode: "user",
              }
            : false,
      };

      console.log("🎤 getUserMedia:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log("🎤 Audio tracks:", stream.getAudioTracks());

      console.log("📹 Video tracks:", stream.getVideoTracks());

      localStream.current = stream;

      setLocalStream(stream);

      if (callType === "video") {
        setTimeout(() => {
          attachLocalVideo();
        }, 0);
      }

      return stream;
    } catch (error) {
      console.error("❌ getUserMedia failed:", error);

      throw error;
    }
  };

  // =========================================================
  // CREATE PEER CONNECTION
  // =========================================================

  const createPeerConnection = useCallback(
    async (onIceCandidate) => {
      if (peerConnection.current) {
        console.log("⚠️ Existing PeerConnection found");

        cleanup();
      }

      const iceServers = await getIceServers();

      const pc = new RTCPeerConnection(iceServers);

      // -------------------------
      // REMOTE TRACK
      // -------------------------

      pc.ontrack = (event) => {
        console.log("📥 REMOTE TRACK:", event.track.kind);

        let stream;

        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
        } else {
          if (!remoteStream.current) {
            remoteStream.current = new MediaStream();
          }

          remoteStream.current.addTrack(event.track);

          stream = remoteStream.current;
        }

        remoteStream.current = stream;

        setRemoteStream(stream);

        // -------------------------
        // VIDEO
        // -------------------------

        if (event.track.kind === "video") {
          setTimeout(() => {
            attachRemoteVideo();
          }, 0);
        }

        // -------------------------
        // AUDIO
        // -------------------------

        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();

          remoteAudioRef.current.autoplay = true;

          remoteAudioRef.current.playsInline = true;
        }

        remoteAudioRef.current.srcObject = stream;

        remoteAudioRef.current.play().catch((error) => {
          console.log("Audio autoplay waiting:", error);
        });
      };

      // -------------------------
      // LOCAL TRACKS
      // -------------------------

      if (!localStream.current) {
        await startLocalStream();
      }

      const tracks = localStream.current.getTracks();

      tracks.forEach((track) => {
        pc.addTrack(track, localStream.current);
      });

      // -------------------------
      // ICE
      // -------------------------

      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      // -------------------------
      // ICE STATE
      // -------------------------

      pc.oniceconnectionstatechange = () => {
        console.log("🌐 ICE STATE:", pc.iceConnectionState);

        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          console.log("✅ WEBRTC CONNECTED");

          setIsCallActive(true);

          // THIS is the ONLY place
          // where we declare connected.
          setCallState("connected");

          if (callType === "video") {
            setTimeout(() => {
              attachLocalVideo();
              attachRemoteVideo();
            }, 100);
          }
        }

        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed"
        ) {
          console.log("⚠️ ICE:", pc.iceConnectionState);
        }
      };

      peerConnection.current = pc;

      return pc;
    },
    [
      cleanup,
      callType,
      setCallState,
      setRemoteStream,
      attachLocalVideo,
      attachRemoteVideo,
    ],
  );

  // =========================================================
  // OFFER
  // =========================================================

  const createOffer = async (onIceCandidate) => {
    await startLocalStream();

    const pc = await createPeerConnection(onIceCandidate);

    console.log("📤 CREATING OFFER");

    const offer = await pc.createOffer();

    await pc.setLocalDescription(offer);

    return offer;
  };

  // =========================================================
  // ANSWER
  // =========================================================

  const createAnswer = async (offer, onIceCandidate) => {
    console.log("📥 CREATE ANSWER");

    await startLocalStream();

    const pc = await createPeerConnection(onIceCandidate);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // -------------------------
    // QUEUED ICE
    // -------------------------

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("❌ Queued ICE error:", error);
      }
    }

    console.log("📤 CREATING ANSWER");

    const answer = await pc.createAnswer();

    await pc.setLocalDescription(answer);

    return answer;
  };

  // =========================================================
  // REMOTE ANSWER
  // =========================================================

  const setRemoteAnswer = async (answer) => {
    if (!peerConnection.current) {
      console.log("❌ No PeerConnection");

      return;
    }

    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );

      console.log("✅ REMOTE ANSWER SET");

      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();

        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
    } catch (error) {
      console.error("❌ Remote answer error:", error);
    }
  };

  // =========================================================
  // ICE CANDIDATE
  // =========================================================

  const addIceCandidate = async (candidate) => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) {
      console.log("⏳ QUEUING ICE");

      iceCandidatesQueue.current.push(candidate);

      return;
    }

    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate),
      );

      console.log("✅ ICE ADDED");
    } catch (error) {
      console.error("❌ ICE ERROR:", error);
    }
  };

  // =========================================================
  // MUTE
  // =========================================================

  const toggleMute = (shouldMute) => {
    if (!localStream.current) {
      return;
    }

    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !shouldMute;
    });

    setIsMuted(shouldMute);
  };

  // =========================================================
  // CAMERA
  // =========================================================

  const toggleCamera = (shouldTurnOff) => {
    if (callType !== "video") {
      return;
    }

    if (!localStream.current) {
      return;
    }

    localStream.current.getVideoTracks().forEach((track) => {
      track.enabled = !shouldTurnOff;
    });

    setIsCameraOn(!shouldTurnOff);

    if (!shouldTurnOff) {
      setTimeout(() => {
        attachLocalVideo();
      }, 0);
    }
  };

  // =========================================================
  // END LOCAL WEBRTC
  // =========================================================

  const endCall = () => {
    cleanup();
  };

  return {
    localStream,
    remoteStream,

    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,

    isCallActive,
    isMuted,
    isCameraOn,

    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,

    toggleMute,
    toggleCamera,

    startLocalStream,

    endCall,
  };
};

export default useWebRTC;
