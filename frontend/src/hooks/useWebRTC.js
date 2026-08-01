// hooks/useWebRTC.js
import { useRef, useState, useCallback } from "react";
import { useCall } from "../context/CallContext";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const useWebRTC = () => {
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const [isCallActive, setIsCallActive] = useState(false);

  // ✅ TOP LEVEL HOOK CALL: Put this here!
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

  // const startLocalStream = async () => {
  //   try {
  //     if (!localStream.current) {
  //       const stream = await navigator.mediaDevices.getUserMedia({
  //         audio: true,
  //         video: false,
  //       });
  //       localStream.current = stream;
  //     }
  //     return localStream.current;
  //   } catch (error) {
  //     console.error("Error accessing microphone:", error);
  //     throw error;
  //   }
  // };

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
    (onIceCandidate) => {
      if (peerConnection.current) {
        cleanup();
      }

      // ❌ DO NOT call useCall() in here! It is already initialized at the top level.

      const pc = new RTCPeerConnection(servers);

      // if (localStream.current) {
      //   localStream.current.getTracks().forEach((track) => {
      //     pc.addTrack(track, localStream.current);
      //   });
      // }

      // pc.ontrack = (event) => {
      //   console.log(event.streams[0]);
      //   console.log(event.streams[0].getTracks());
      //   console.log(event.streams[0].getAudioTracks());
      //   if (event.streams && event.streams[0]) {
      //     if (setRemoteStream) {
      //       setRemoteStream(event.streams[0]);
      //     }

      //     if (!remoteAudioRef.current) {
      //       remoteAudioRef.current = new Audio();
      //       remoteAudioRef.current.autoplay = true;
      //     }
      //     remoteAudioRef.current.srcObject = event.streams[0];
      //   }
      // };

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

        // Save stream in context (optional, for UI)
        if (setRemoteStream) {
          setRemoteStream(remoteStream);
        }

        // Create audio element once
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.playsInline = true;
        }

        // Prevent assigning the same stream repeatedly
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }

        // Force playback (important for Firefox)
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

  // const createOffer = async (onIceCandidate) => {
  //   await startLocalStream();
  //   const pc = createPeerConnection(onIceCandidate);

  //   const offer = await pc.createOffer();
  //   await pc.setLocalDescription(offer);
  //   setIsCallActive(true);
  //   return offer;
  // };

  const createOffer = async (onIceCandidate) => {
    console.log("1. Before startLocalStream");

    await startLocalStream();

    console.log("2. After startLocalStream");

    const pc = createPeerConnection(onIceCandidate);

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
    const pc = createPeerConnection(onIceCandidate);

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
