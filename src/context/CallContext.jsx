// CallProvider.js
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";

const CallContext = createContext(null);

export const CallProvider = ({ currentUser, children }) => {
  const socket = useSocket();
  const pcRef = useRef(null);

  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  

  const createPeer = async (withVideo) => {
    if (
      !window.RTCPeerConnection ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      throw new Error("WebRTC or media devices not supported in this browser.");
    }

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      // Add TURN servers here
    ];

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    setIsVideoCall(withVideo);

    const constraints = withVideo
      ? { video: true, audio: true }
      : { video: false, audio: true };

    let local;
    try {
      local = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setLocalStream(null);
      setRemoteStream(null);
      throw err;
    }
    setLocalStream(local);

    // Start with an empty remote stream; will be replaced when tracks come in
    setRemoteStream(new MediaStream());

    // Add local tracks to peer connection
    local.getTracks().forEach((track) => pc.addTrack(track, local));

    // Updated ontrack to handle adding tracks more robustly
    pc.ontrack = (event) => {
      // Sometimes multiple tracks come in separate events,
      // add each track to a MediaStream and update remoteStream state
      setRemoteStream((prevStream) => {
        // If prevStream does not contain this track, add it
        if (!prevStream) {
          const newStream = new MediaStream();
          newStream.addTrack(event.track);
          return newStream;
        }
        // Check if track already exists to prevent duplicates
        const exists = prevStream.getTracks().some(t => t.id === event.track.id);
        if (!exists) {
          prevStream.addTrack(event.track);
        }
        return prevStream;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserId) {
        socket?.emit("webrtc-ice", {
          from: currentUser._id,
          to: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        ["disconnected", "failed", "closed"].includes(pc.connectionState)
      ) {
        hangUp();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
      ) {
        hangUp();
      }
    };

    return pc;
  };

  const endCall = useCallback(() => {
    try {
      pcRef.current
        ?.getSenders()
        ?.forEach((sender) => sender.track && sender.track.stop());
      pcRef.current?.close();
    } catch {
      // Ignore cleanup errors
    }
    pcRef.current = null;

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    setInCall(false);
    setRemoteUserId(null);
    setIncomingCall(null);
  }, [localStream, remoteStream]);

  const startCall = async (to, withVideo = true) => {
    setRemoteUserId(to);
    const pc = await createPeer(withVideo);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);



    setInCall(true);
    setIncomingCall(null);

    socket?.emit("webrtc-offer", {
      from: currentUser._id,
      to,
      offer,
      video: withVideo,
    });
  };

  const acceptCall = async () => {
    if (!incomingCall?.offer || !incomingCall.from) return;
    setRemoteUserId(incomingCall.from);
    const pc = await createPeer(incomingCall.video);

    await pc.setRemoteDescription(
      new RTCSessionDescription(incomingCall.offer)
    );
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    setInCall(true);

    socket?.emit("webrtc-answer", {
      from: currentUser._id,
      to: incomingCall.from,
      answer,
    });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall?.from) return;
    socket?.emit("webrtc-end", {
      from: currentUser._id,
      to: incomingCall.from,
    });
    setIncomingCall(null);
  };

  const hangUp = () => {
    if (!remoteUserId) return;
    socket?.emit("webrtc-end", {
      from: currentUser._id,
      to: remoteUserId,
    });
    endCall();
  };

  useEffect(() => {
    if (!socket || !currentUser) return;

    const onOffer = ({ from, offer, video }) => {
      if (!inCall) {
        setRemoteUserId(from);
        setIncomingCall({ from, offer, video });
      } else {
        console.log("Incoming call while already in call - ignoring");
      }
    };

    const onAnswer = async ({ answer }) => {
      if (pcRef.current && answer) {
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        } catch (err) {
          console.error("Error setting remote description on answer:", err);
        }
      }
    };

    const onIce = async ({ candidate }) => {
      if (candidate && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("ICE candidate error:", err);
        }
      }
    };

    const onEndCall = () => {
      endCall();
    };

    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);
    socket.on("webrtc-end", onEndCall);

    return () => {
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
      socket.off("webrtc-end", onEndCall);
    };
  }, [socket, currentUser, endCall, inCall]);

  return (
    <CallContext.Provider
      value={{
        inCall,
        incomingCall,
        localStream,
        remoteStream,
        localVideoRef,
        remoteVideoRef,
        startCall,
        acceptCall,
        rejectCall,
        hangUp,
        isVideoCall
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
