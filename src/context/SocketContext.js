import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
const SERVER_URL = process.env.REACT_APP_SERVER_URL;

const SocketContext = createContext();

export const SocketProvider = ({ children, currentUser }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Create socket
    const newSocket = io(SERVER_URL, {
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
