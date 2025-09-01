import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const SocketProvider = ({ children, currentUser }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Create socket
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    // Emit "add-user" once connected
    const onConnect = () => {
      newSocket.emit("add-user", currentUser._id);
    };

    newSocket.on("connect", onConnect);

    // Clean up on unmount
    return () => {
      newSocket.off("connect", onConnect);
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
