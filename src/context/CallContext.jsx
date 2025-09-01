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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Assign streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Create peer connection and get media only when starting or accepting a call
  const createPeer = async (withVideo) => {
    if (
      !window.RTCPeerConnection ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      throw new Error("WebRTC or media devices not supported in this browser.");
    }

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

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

    const remote = new MediaStream();
    setRemoteStream(remote);

    local.getTracks().forEach((track) => pc.addTrack(track, local));

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
      setRemoteStream(new MediaStream(remote.getTracks()));
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

    return pc;
  };

  // End call and cleanup
  const endCall = useCallback(() => {
    try {
      pcRef.current
        ?.getSenders()
        ?.forEach((sender) => sender.track && sender.track.stop());
      pcRef.current?.close();
    } catch (e) {
      // ignore errors on cleanup
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

  // Start a call
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

  // Accept incoming call
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

  // Reject incoming call
  const rejectCall = () => {
    if (!incomingCall?.from) return;
    socket?.emit("webrtc-end", {
      from: currentUser._id,
      to: incomingCall.from,
    });
    setIncomingCall(null);
  };

  // Hang up ongoing call
  const hangUp = () => {
    if (!remoteUserId) return;
    socket?.emit("webrtc-end", {
      from: currentUser._id,
      to: remoteUserId,
    });
    endCall();
  };

  // Socket listeners
  useEffect(() => {
    if (!socket || !currentUser) return;

    const onOffer = ({ from, offer, video }) => {
      if (!inCall) {
        setIncomingCall({ from, offer, video });
      } else {
        console.log("Incoming call while already in call - ignoring");
      }
    };

    const onAnswer = async ({ answer }) => {
      if (pcRef.current && answer) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
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
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
