// hooks/useWebRTC.js
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
      cachedServers = { iceServers: data.iceServers };
    } else {
      throw new Error("Invalid TURN credentials response");
    }
  } catch (err) {
    console.error(
      "Failed to fetch TURN credentials, falling back to STUN only:",
      err,
    );
    cachedServers = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }

  return cachedServers;
};
const servers = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const useWebRTC = () => {
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const [isCallActive, setIsCallActive] = useState(false);

  const { setCallState, setRemoteStream } = useCall();

  const cleanup = useCallback(() => {
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
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    iceCandidatesQueue.current = [];
    setIsCallActive(false);
  }, []);

  const startLocalStream = async () => {
    try {
      if (!localStream.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log("🎤 Local Stream:", stream);
        console.log("🎤 Audio Tracks:", stream.getAudioTracks());

        localStream.current = stream;
      }

      return localStream.current;
    } catch (error) {
      console.error("Microphone Error:", error);
      throw error;
    }
  };

  const createPeerConnection = useCallback(
    async (onIceCandidate) => {
      if (peerConnection.current) {
        cleanup();
      }

      const servers = await getIceServers();
      const pc = new RTCPeerConnection(servers);

      pc.ontrack = (event) => {
        console.log("========== REMOTE TRACK RECEIVED ==========");

        if (!event.streams || event.streams.length === 0) {
          console.log("❌ No remote stream received");
          return;
        }

        const remoteStream = event.streams[0];

        console.log("Remote Stream:", remoteStream);
        console.log("Tracks:", remoteStream.getTracks());
        console.log("Audio Tracks:", remoteStream.getAudioTracks());

        if (setRemoteStream) {
          setRemoteStream(remoteStream);
        }

        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.playsInline = true;
        }

        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }

        remoteAudioRef.current
          .play()
          .then(() => {
            console.log("✅ Remote audio is playing");
          })
          .catch((err) => {
            console.error("❌ Failed to play remote audio:", err);
          });

        console.log("===========================================");
      };

      localStream.current.getTracks().forEach((track) => {
        console.log("Adding Track:", track.kind, track.enabled);
        pc.addTrack(track, localStream.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE Connection State changed:", pc.iceConnectionState);
        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          setIsCallActive(true);
          if (setCallState) {
            console.log("CALL CONNECTED");
            setCallState("connected");
          }
        }
      };

      peerConnection.current = pc;
      return pc;
    },
    [cleanup, setCallState, setRemoteStream],
  );

  const createOffer = async (onIceCandidate) => {
    console.log("1. Before startLocalStream");
    await startLocalStream();
    console.log("2. After startLocalStream");

    const pc = await createPeerConnection(onIceCandidate);

    console.log("3. Before createOffer");
    const offer = await pc.createOffer();
    console.log("4. After createOffer");

    console.log("5. Before setLocalDescription");
    await pc.setLocalDescription(offer);
    console.log("6. After setLocalDescription");

    return offer;
  };

  const createAnswer = async (offer, onIceCandidate) => {
    await startLocalStream();
    const pc = await createPeerConnection(onIceCandidate);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setIsCallActive(true);
    return answer;
  };

  const setRemoteAnswer = async (answer) => {
    if (!peerConnection.current) return;
    try {
      console.log("Setting remote description");
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
      console.log("Remote description set");

      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
    } catch (e) {
      console.error("Failed to set remote description:", e);
    }
  };

  const addIceCandidate = async (candidate) => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) {
      iceCandidatesQueue.current.push(candidate);
      return;
    }

    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate),
      );
    } catch (e) {
      console.error("Failed to add ICE candidate:", e);
    }
  };

  const toggleMute = (shouldMute) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !shouldMute;
      });
    }
  };

  const endCall = () => {
    cleanup();
  };

  return {
    remoteAudioRef,
    isCallActive,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleMute,
    endCall,
  };
};

export default useWebRTC;
