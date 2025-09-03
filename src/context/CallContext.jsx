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

  const localMediaRef = useRef(null);
  const remoteMediaRef = useRef(null);

  // Attach streams to media elements
  useEffect(() => {
    if (localMediaRef.current && localStream) {
      localMediaRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteMediaRef.current && remoteStream) {
      remoteMediaRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const createPeer = async (withVideo) => {
    
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("WebRTC not supported in this browser.");
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    const constraints = { audio: true, video: withVideo };

    let local;
    try {
      local = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error("Media devices error:", err);
      setLocalStream(null);
      setRemoteStream(null);
      throw err;
    }
    setLocalStream(local);

    const remote = new MediaStream();
    setRemoteStream(remote);

    local.getTracks().forEach((track) => pc.addTrack(track, local));
    
    pc.ontrack = (event) => {
      console.log('pc on track')
      event.streams[0].getTracks().forEach(track => {
      remote.addTrack(track);
    });
      // setRemoteStream(event.streams[0]);
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

  const endCall = useCallback(() => {
    try {
      pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    localStream?.getTracks().forEach((t) => t.stop());
    remoteStream?.getTracks().forEach((t) => t.stop());

    setLocalStream(null);
    setRemoteStream(null);
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

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
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
    socket?.emit("webrtc-end", { from: currentUser._id, to: incomingCall.from });
    setIncomingCall(null);
  };

  const hangUp = () => {
    if (!remoteUserId) return;
    socket?.emit("webrtc-end", { from: currentUser._id, to: remoteUserId });
    endCall();
  };

  useEffect(() => {
    if (!socket || !currentUser) return;

    const onOffer = ({ from, offer, video }) => {
      if (!inCall) setIncomingCall({ from, offer, video });
    };

    const onAnswer = async ({ answer }) => {
      if (pcRef.current && answer) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
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

    const onEndCall = () => endCall();

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
        localMediaRef,
        remoteMediaRef,
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