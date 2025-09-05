import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";

const CallContext = createContext();

export const CallProvider = ({ children, currentUser }) => {
  const socket = useSocket();
  const [incomingCall, setIncomingCall] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [calling, setCalling] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIntervalRef = useRef(null);

  // Initialize WebRTC
  const initializePeerConnection = () => {
    console.log("Initializing peer connection...");

    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]
    };

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (isVideoCall) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
      } else {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
    };

    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && socket && remoteUserId) {
        console.log("Sending ICE candidate");
        socket.emit("webrtc-ice", {
          from: currentUser._id,
          to: remoteUserId,
          candidate: event.candidate
        });
      }
    };

    // Connection state monitoring
    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log("Connection state:", peerConnectionRef.current.connectionState);
    };

    peerConnectionRef.current.oniceconnectionstatechange = () => {
      console.log("ICE state:", peerConnectionRef.current.iceConnectionState);
    };

    return peerConnectionRef.current;
  };

  // Get user media with better error handling
  const getUserMedia = async (video = false) => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: video ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        } : false
      };

      console.log("Requesting media with constraints:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got media stream with tracks:", stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));

      localStreamRef.current = stream;

      // Set to video element and ensure it plays
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Set local video srcObject");

        // Force play the local stream
        const playPromise = localVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Local video/audio playing");
            })
            .catch(e => {
              console.log("Local auto-play prevented:", e.message);
            });
        }
      }

      return stream;
    } catch (error) {
      console.error("❌ getUserMedia error:", error);
      alert(`Media access failed: ${error.message}`);
      throw error;
    }
  };

  // Start call duration timer
  const startCallTimer = () => {
    setCallStartTime(Date.now());
    setCallDuration(0);

    callIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop call duration timer
  const stopCallTimer = () => {
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
      callIntervalRef.current = null;
    }
    setCallDuration(0);
    setCallStartTime(null);
  };

  const testMediaDevices = async () => {
    try {
      console.log("Testing media devices...");

      // List available devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("Available devices:", devices.map(d => ({
          kind: d.kind,
          label: d.label,
          deviceId: d.deviceId
        })));
      }

      // Test basic audio
      console.log("Testing audio access...");
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Audio access works:", audioStream.getAudioTracks());

      // Test basic video
      console.log("Testing video access...");
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Video access works:", videoStream.getVideoTracks());

      // Clean up test streams
      audioStream.getTracks().forEach(track => track.stop());
      videoStream.getTracks().forEach(track => track.stop());

      console.log("All media tests passed!");
      return true;
    } catch (error) {
      console.error("❌ Media test failed:", error);
      return false;
    }
  };

  // Start a call
  const startCall = async (userId, userName, videoCall = false) => {
    try {
      console.log(`Starting ${videoCall ? 'video' : 'audio'} call to ${userName}`);

      setIsVideoCall(videoCall);
      setCallerName(userName);
      setRemoteUserId(userId);
      setCalling(true);

      // Get user media first
      const stream = await getUserMedia(videoCall);

      // Initialize peer connection
      const pc = initializePeerConnection();

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track`);
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("Sending offer...");
      socket.emit("webrtc-offer", {
        from: currentUser._id,
        to: userId,
        offer: offer,
        isVideoCall: videoCall,
        callerName: currentUser.username
      });

    } catch (error) {
      console.error("❌ Start call error:", error);
      cleanup();
    }
  };

  // Accept call
  const acceptCall = async () => {
    try {
      console.log(`Accepting ${isVideoCall ? 'video' : 'audio'} call`);

      const stream = await getUserMedia(isVideoCall);
      const pc = initializePeerConnection();

      // Add tracks
      stream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track`);
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(incomingCall.offer);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("Sending answer...");
      socket.emit("webrtc-answer", {
        from: currentUser._id,
        to: incomingCall.from,
        answer: answer
      });

      setRemoteUserId(incomingCall.from);
      setIncomingCall(false);
      setInCall(true);
      startCallTimer();

    } catch (error) {
      console.error("❌ Accept call error:", error);
      cleanup();
    }
  };

  // Reject call
  const rejectCall = () => {
    console.log("Rejecting call");
    if (incomingCall?.from) {
      socket.emit("webrtc-end", {
        from: currentUser._id,
        to: incomingCall.from
      });
    }
    cleanup();
  };

  // Cancel call
  const cancelCall = () => {
    console.log("Canceling call");
    if (remoteUserId) {
      socket.emit("webrtc-end", {
        from: currentUser._id,
        to: remoteUserId
      });
    }
    cleanup();
  };

  // Hang up call
  const hangUp = () => {
    console.log("Hanging up call");
    if (remoteUserId) {
      socket.emit("webrtc-end", {
        from: currentUser._id,
        to: remoteUserId
      });
    }
    cleanup();
  };

  // Cleanup function
  const cleanup = () => {
    console.log("Cleaning up...");

    stopCallTimer();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIncomingCall(false);
    setInCall(false);
    setCalling(false);
    setIsVideoCall(false);
    setCallerName("");
    setRemoteUserId(null);
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleOffer = ({ from, offer, isVideoCall: videoCall, callerName: name }) => {
      console.log(`📞 Incoming ${videoCall ? 'video' : 'audio'} call from ${name}`);
      setIncomingCall({ from, offer });
      setIsVideoCall(videoCall);
      setCallerName(name);
      setRemoteUserId(from);
    };

    const handleAnswer = async ({ answer }) => {
      console.log("📞 Received answer");
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(answer);
          setCalling(false);
          setInCall(true);
          startCallTimer();
        } catch (error) {
          console.error("❌ Error setting remote description:", error);
        }
      }
    };

    const handleIce = async ({ candidate }) => {
      console.log("🧊 Received ICE candidate");
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
          console.error("❌ Error adding ICE candidate:", error);
        }
      }
    };

    const handleEnd = () => {
      console.log("📞 Call ended");
      cleanup();
    };

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice", handleIce);
    socket.on("webrtc-end", handleEnd);

    return () => {
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice", handleIce);
      socket.off("webrtc-end", handleEnd);
    };
  }, [socket, isVideoCall]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  const value = {
  incomingCall,
  inCall,
  calling,
  isVideoCall,
  callerName,
  callDuration: formatDuration(callDuration),
  acceptCall,
  rejectCall,
  cancelCall,
  hangUp,
  startCall,
  testMediaDevices,
  localVideoRef,
  remoteVideoRef,
};

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};