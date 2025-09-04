import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const SocketContext = createContext();

export const SocketProvider = ({ children, currentUser }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    console.log("🔌 Connecting to socket server:", SERVER_URL);
    const newSocket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true
    });

    setSocket(newSocket);

    const onConnect = () => {
      console.log("✅ Socket connected:", newSocket.id);
      newSocket.emit("add-user", currentUser._id);
    };

    const onDisconnect = (reason) => {
      console.log("❌ Socket disconnected:", reason);
    };

    const onError = (error) => {
      console.error("🔴 Socket error:", error);
    };

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("error", onError);

    return () => {
      console.log("🧹 Cleaning up socket connection");
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("error", onError);
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
