import React, { useContext, useRef } from "react";
import { CallContext } from "./CallContext"; // Adjust path accordingly

const CallUI = () => {
  const {
    socket,
    currentUser,
    selectedUser,
    incomingCall,
    callAccepted,
    remoteStream,
    localStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useContext(CallContext);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  // Attach streams to video elements
  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2>Call UI</h2>

      {/* Local Video */}
      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 200, height: 150, backgroundColor: "#000" }} />

      {/* Remote Video */}
      {callAccepted && remoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 200, height: 150, backgroundColor: "#000" }} />
      )}

      {/* Call Buttons */}
      {!callAccepted && !incomingCall && selectedUser?._id && (
        <button onClick={() => startCall(selectedUser._id)}>📞 Call {selectedUser.username || "User"}</button>
      )}

      {incomingCall && !callAccepted && (
        <div>
          <p>📲 {incomingCall.from} is calling...</p>
          <button onClick={acceptCall}>✅ Accept</button>
          <button onClick={rejectCall}>❌ Reject</button>
        </div>
      )}

      {callAccepted && (
        <button onClick={endCall} style={{ backgroundColor: "red", color: "white" }}>🔚 End Call</button>
      )}
    </div>
  );
};

export default CallUI;
