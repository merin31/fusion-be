import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const SocketProvider = ({ children, currentUser }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    const onConnect = () => {
      newSocket.emit("add-user", currentUser._id);
    };

    newSocket.on("connect", onConnect);

    // Example handlers for WebRTC signaling
    // These handlers should be managed in your component where WebRTC logic lives,
    // or you can create callback props to handle these externally.
    newSocket.on("call-made", (data) => {
      // handle the call offer received from caller
      // e.g. set remote description in RTCPeerConnection
      console.log("Received call offer", data);
    });

    newSocket.on("answer-made", (data) => {
      // handle the call answer
      console.log("Received call answer", data);
    });

    newSocket.on("ice-candidate", (candidate) => {
      // handle ICE candidate
      console.log("Received ICE candidate", candidate);
    });

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("call-made");
      newSocket.off("answer-made");
      newSocket.off("ice-candidate");
      newSocket.disconnect();
    };
  }, [currentUser]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
