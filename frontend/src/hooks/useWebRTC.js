import { useRef, useState, useCallback } from "react";
import { useCall } from "../context/callContext";

let cachedServers = null;

const getIceServers = async () => {
  if (cachedServers) return cachedServers;

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

  const {
    setCallState,
    setRemoteStream,
    setLocalStream,
  } = useCall();

  // --------------------------------------------------
  // ATTACH LOCAL VIDEO
  // --------------------------------------------------

  const attachLocalVideo = useCallback(() => {
    if (!localVideoRef.current || !localStream.current) {
      return;
    }

    const video = localVideoRef.current;

    if (video.srcObject !== localStream.current) {
      video.srcObject = localStream.current;
    }

    video.play().catch((error) => {
      console.log("Local video play waiting:", error);
    });
  }, []);

  // --------------------------------------------------
  // ATTACH REMOTE VIDEO
  // --------------------------------------------------

  const attachRemoteVideo = useCallback(() => {
    if (!remoteVideoRef.current || !remoteStream.current) {
      return;
    }

    const video = remoteVideoRef.current;

    if (video.srcObject !== remoteStream.current) {
      video.srcObject = remoteStream.current;
    }

    video.play().catch((error) => {
      console.log("Remote video play waiting:", error);
    });
  }, []);

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning WebRTC");

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.oniceconnectionstatechange = null;

      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    remoteStream.current = null;

    iceCandidatesQueue.current = [];

    setLocalStream(null);
    setRemoteStream(null);

    setIsCallActive(false);
    setIsMuted(false);
    setIsCameraOn(true);
  }, [setLocalStream, setRemoteStream]);

  // --------------------------------------------------
  // GET CAMERA + MICROPHONE
  // --------------------------------------------------

  const startLocalStream = async () => {
    try {
      if (!localStream.current) {
        console.log("🎥 Requesting camera + microphone");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },

          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "user",
          },
        });

        console.log("🎥 Local stream:", stream);
        console.log("🎤 Audio:", stream.getAudioTracks());
        console.log("📹 Video:", stream.getVideoTracks());

        localStream.current = stream;

        setLocalStream(stream);

        // Attach immediately if video element exists
        setTimeout(() => {
          attachLocalVideo();
        }, 0);
      }

      return localStream.current;
    } catch (error) {
      console.error("❌ Camera/Microphone error:", error);
      throw error;
    }
  };

  // --------------------------------------------------
  // CREATE PEER CONNECTION
  // --------------------------------------------------

  const createPeerConnection = useCallback(
    async (onIceCandidate) => {
      if (peerConnection.current) {
        console.log("⚠️ Existing peer connection found");
        cleanup();
      }

      const iceServers = await getIceServers();

      const pc = new RTCPeerConnection(iceServers);

      // ------------------------------------------------
      // REMOTE TRACK
      // ------------------------------------------------

      pc.ontrack = (event) => {
        console.log("================================");
        console.log("📥 REMOTE TRACK RECEIVED");
        console.log("Track kind:", event.track.kind);
        console.log("Track enabled:", event.track.enabled);
        console.log("Track state:", event.track.readyState);
        console.log("================================");

        let stream;

        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
        } else {
          // Fallback when browser doesn't provide event.streams
          if (!remoteStream.current) {
            remoteStream.current = new MediaStream();
          }

          remoteStream.current.addTrack(event.track);
          stream = remoteStream.current;
        }

        remoteStream.current = stream;

        console.log(
          "📥 Remote audio tracks:",
          stream.getAudioTracks(),
        );

        console.log(
          "📥 Remote video tracks:",
          stream.getVideoTracks(),
        );

        setRemoteStream(stream);

        // ------------------------------------------------
        // REMOTE VIDEO
        // ------------------------------------------------

        if (event.track.kind === "video") {
          console.log("📹 Remote VIDEO track received");

          setTimeout(() => {
            attachRemoteVideo();
          }, 0);
        }

        // ------------------------------------------------
        // REMOTE AUDIO
        // ------------------------------------------------

        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();

          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.playsInline = true;
        }

        remoteAudioRef.current.srcObject = stream;

        remoteAudioRef.current
          .play()
          .then(() => {
            console.log("🔊 Remote audio playing");
          })
          .catch((error) => {
            console.log("Audio autoplay waiting:", error);
          });
      };

      // ------------------------------------------------
      // ADD LOCAL TRACKS
      // ------------------------------------------------

      if (!localStream.current) {
        await startLocalStream();
      }

      const tracks = localStream.current.getTracks();

      console.log("➕ Adding local tracks:", tracks);

      tracks.forEach((track) => {
        console.log(
          "➕ Track:",
          track.kind,
          "enabled:",
          track.enabled,
        );

        pc.addTrack(track, localStream.current);
      });

      // ------------------------------------------------
      // ICE
      // ------------------------------------------------

      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      // ------------------------------------------------
      // ICE STATE
      // ------------------------------------------------

      pc.oniceconnectionstatechange = () => {
        console.log(
          "🌐 ICE state:",
          pc.iceConnectionState,
        );

        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          console.log("✅ WEBRTC CONNECTED");

          setIsCallActive(true);
          setCallState("connected");

          // Make sure video gets attached
          setTimeout(() => {
            attachLocalVideo();
            attachRemoteVideo();
          }, 100);
        }
      };

      peerConnection.current = pc;

      return pc;
    },
    [
      cleanup,
      setCallState,
      setRemoteStream,
      attachLocalVideo,
      attachRemoteVideo,
    ],
  );

  // --------------------------------------------------
  // CREATE OFFER
  // --------------------------------------------------

  const createOffer = async (onIceCandidate) => {
    console.log("1️⃣ Starting local camera/mic");

    await startLocalStream();

    console.log("2️⃣ Local stream ready");

    const pc = await createPeerConnection(onIceCandidate);

    console.log("3️⃣ Creating offer");

    const offer = await pc.createOffer();

    console.log("4️⃣ Offer created");

    await pc.setLocalDescription(offer);

    console.log("5️⃣ Local description set");

    return offer;
  };

  // --------------------------------------------------
  // CREATE ANSWER
  // --------------------------------------------------

  const createAnswer = async (offer, onIceCandidate) => {
    console.log("📥 Creating answer");

    await startLocalStream();

    console.log(
      "📹 Answerer local video tracks:",
      localStream.current.getVideoTracks(),
    );

    const pc = await createPeerConnection(onIceCandidate);

    console.log("📥 Setting remote offer");

    await pc.setRemoteDescription(
      new RTCSessionDescription(offer),
    );

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();

      await pc.addIceCandidate(
        new RTCIceCandidate(candidate),
      );
    }

    console.log("📤 Creating answer");

    const answer = await pc.createAnswer();

    await pc.setLocalDescription(answer);

    setIsCallActive(true);

    return answer;
  };

  // --------------------------------------------------
  // REMOTE ANSWER
  // --------------------------------------------------

  const setRemoteAnswer = async (answer) => {
    if (!peerConnection.current) {
      console.log("❌ No peer connection");
      return;
    }

    try {
      console.log("📥 Setting remote answer");

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );

      console.log("✅ Remote answer set");

      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();

        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
    } catch (error) {
      console.error(
        "❌ Remote answer error:",
        error,
      );
    }
  };

  // --------------------------------------------------
  // ICE CANDIDATE
  // --------------------------------------------------

  const addIceCandidate = async (candidate) => {
    if (
      !peerConnection.current ||
      !peerConnection.current.remoteDescription
    ) {
      console.log("⏳ Queueing ICE");

      iceCandidatesQueue.current.push(candidate);

      return;
    }

    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate),
      );

      console.log("✅ ICE added");
    } catch (error) {
      console.error("❌ ICE error:", error);
    }
  };

  // --------------------------------------------------
  // MUTE
  // --------------------------------------------------

  const toggleMute = (shouldMute) => {
    if (!localStream.current) return;

    const audioTracks =
      localStream.current.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !shouldMute;
    });

    setIsMuted(shouldMute);
  };

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  const toggleCamera = (shouldTurnOff) => {
    if (!localStream.current) {
      console.log("❌ No local stream for camera toggle");
      return;
    }

    const videoTracks =
      localStream.current.getVideoTracks();

    console.log(
      "📹 Camera tracks:",
      videoTracks,
    );

    videoTracks.forEach((track) => {
      track.enabled = !shouldTurnOff;

      console.log(
        shouldTurnOff
          ? "📷 Camera OFF"
          : "📹 Camera ON",
        "enabled:",
        track.enabled,
      );
    });

    setIsCameraOn(!shouldTurnOff);

    // Keep video element connected
    if (!shouldTurnOff) {
      setTimeout(() => {
        attachLocalVideo();
      }, 0);
    }
  };

  // --------------------------------------------------
  // END CALL
  // --------------------------------------------------

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
