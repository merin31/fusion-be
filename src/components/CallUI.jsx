import React, { useEffect, useRef, useState } from "react";

const CallUI = ({ socket, currentUser, selectedUser }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();

  // ✅ Debug logger
  const logEvent = (event, data = {}) => {
    console.log(`📡 [CallUI] ${event}:`, data);
  };

  // ✅ Create RTCPeerConnection with STUN servers
  const createPeerConnection = () => {
    logEvent("Creating PeerConnection");
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.ontrack = (event) => {
      logEvent("Remote track received");
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      else {
        const [remoteStream] = event.streams;
        const audioElement = document.getElementById("remoteAudio");
        audioElement.srcObject = remoteStream;
        audioElement.play().catch(err => console.error("Playback failed:", err));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const to = incomingCall?.from || selectedUser?._id;
        logEvent("Sending ICE candidate", { to, candidate: event.candidate });
        if (to) {
          socket.emit("webrtc-ice", {
            from: currentUser._id,
            to,
            candidate: event.candidate,
          });
        }
      }
    };

    return pc;
  };

  // 📞 Start call
  const startCall = async () => {
    if (!selectedUser?._id || !currentUser?._id) return;

    logEvent("Starting call", { from: currentUser._id, to: selectedUser._id });

    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      from: currentUser._id,
      to: selectedUser._id,
      offer,
    });
  };

  // 📥 Handle socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("✅ Socket connected in CallUI:", socket.id);
    });

    socket.on("webrtc-offer", ({ from, offer }) => {
      logEvent("Incoming call", { from });
      setIncomingCall({ from, offer });
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      logEvent("Call accepted", { answer });
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
        setCallAccepted(true);
      }
    });

    socket.on("webrtc-ice", ({ candidate }) => {
      logEvent("Received ICE candidate", { candidate });
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("webrtc-end", () => {
      logEvent("Call ended by remote");
      cleanupCall();
    });

    return () => {
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice");
      socket.off("webrtc-end");
    };
  }, [socket]);

  // ✅ Register user once socket + currentUser are ready
  useEffect(() => {
    if (socket && currentUser?._id) {
      socket.emit("add-user", currentUser._id);
      logEvent("User registered on socket", { user: currentUser._id });
    }
  }, [socket, currentUser]);

  // ✅ Accept call
  const acceptCall = async () => {
    if (!incomingCall) return;

    logEvent("Accepting call", { from: incomingCall.from });

    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    await pc.setRemoteDescription(incomingCall.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc-answer", {
      from: currentUser._id,
      to: incomingCall.from,
      answer,
    });

    setCallAccepted(true);
    setIncomingCall(null);
  };

  // ❌ Reject call
  const rejectCall = () => {
    if (!incomingCall) return;
    logEvent("Rejecting call", { from: incomingCall.from });
    socket.emit("webrtc-end", { to: incomingCall.from, from: currentUser._id });
    setIncomingCall(null);
  };

  // 🔚 End call
  const cleanupCall = () => {
    logEvent("Cleaning up call");

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setCallAccepted(false);
    setRemoteStream(null);
    setIncomingCall(null);
  };

  return (
    <div>
      <audio id="remoteAudio" autoPlay playsInline></audio>

      <video ref={localVideoRef} autoPlay playsInline muted className="w-1/2" />
      <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2" />

      {!callAccepted && selectedUser && (
        <button onClick={startCall}>📞 Call {selectedUser.username}</button>
      )}

      {incomingCall && !callAccepted && (
        <div>
          <p>Incoming call from {incomingCall.from}</p>
          <button onClick={acceptCall}>✅ Accept</button>
          <button onClick={rejectCall}>❌ Reject</button>
        </div>
      )}

      {callAccepted && (
        <div>
          <p>Call in progress...</p>
          <button onClick={cleanupCall}>🔚 End Call</button>
        </div>

      )}
    </div>
  );
};

export default CallUI;
