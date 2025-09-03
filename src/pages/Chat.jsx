import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import axios from "axios";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import { allUsersRoute } from "../utils/APIRoutes";
import { SocketProvider } from "../context/SocketContext";
import { CallProvider, useCall } from "../context/CallContext";

// Loading spinner container
const LoadingContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;

  .spinner {
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top: 4px solid #4e0eff;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Call overlay component
const CallOverlay = () => {
  const {
    incomingCall,
    inCall,
    acceptCall,
    rejectCall,
    hangUp,
    localVideoRef,
    remoteVideoRef,
  } = useCall();

  if (!incomingCall && !inCall) return null;

  return (
    <Overlay>
      <VideoContainer>
        <video ref={localVideoRef} autoPlay muted />
        <video ref={remoteVideoRef} autoPlay />
      </VideoContainer>

      <Actions>
        {incomingCall && !inCall && (
          <>
            <button className="answer" onClick={acceptCall}>
              Answer
            </button>
            <button className="reject" onClick={rejectCall}>
              Reject
            </button>
          </>
        )}
        {inCall && (
          <button className="reject" onClick={hangUp}>
            End Call
          </button>
        )}
      </Actions>
    </Overlay>
  );
};

export default function Chat() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [currentUser , setCurrentUser ] = useState(null);

  const LOCAL_KEY = process.env.REACT_APP_LOCALHOST_KEY || "chat-app-user";

  // Load current user from localStorage
  useEffect(() => {
    const storedUser  = localStorage.getItem(LOCAL_KEY);
    if (!storedUser ) {
      navigate("/login");
    } else {
      setCurrentUser (JSON.parse(storedUser ));
    }
  }, [navigate, LOCAL_KEY]);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser ) return;

      if (!currentUser .isAvatarImageSet) {
        navigate("/setAvatar");
        return;
      }

      try {
        const { data } = await axios.get(`${allUsersRoute}/${currentUser ._id}`);
        setContacts(data.filter((user) => user._id !== currentUser ._id));
      } catch (err) {
        console.error("❌ Error fetching contacts:", err);
      }
    };

    fetchContacts();
  }, [currentUser , navigate]);

  const handleChatChange = (chat) => setCurrentChat(chat);

  if (!currentUser ) {
    return (
      <LoadingContainer>
        <div className="spinner" />
        <p>Loading...</p>
      </LoadingContainer>
    );
  }

  return (
    <SocketProvider currentUser ={currentUser }>
      <CallProvider currentUser ={currentUser }>
        <Container>
          <div className="container">
            <Contacts contacts={contacts} changeChat={handleChatChange} />
            {currentChat ? (
              <ChatContainer currentChat={currentChat} currentUser ={currentUser } />
            ) : (
              <Welcome />
            )}
          </div>

          {/* Call overlay */}
          <CallOverlay />
        </Container>
      </CallProvider>
    </SocketProvider>
  );
}

// Styled Components
const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #131324;
  position: relative;

  .container {
    height: 100vh;
    width: 100vw;
    background-color: #00000076;
    display: flex;
    grid-template-columns: 25% 75%;
    transition: all 0.3s ease;

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }

    @media screen and (max-width: 720px) {
      grid-template-columns: 100%;
      grid-template-rows: 30% 70%;
      height: 95vh;
      width: 95vw;
    }
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const VideoContainer = styled.div`
  display: flex;
  gap: 20px;

  video {
    border-radius: 10px;
    width: 300px;
    max-width: 90vw;
    box-shadow: 0 0 10px #4e0eff;
  }
`;

const Actions = styled.div`
  margin-top: 20px;
  display: flex;
  gap: 20px;

  button {
    padding: 12px 24px;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: white;
    font-weight: bold;
    transition: background-color 0.3s ease;
  }

  .answer {
    background-color: #4caf50;
  }
  .answer:hover {
    background-color: #45a049;
  }

  .reject {
    background-color: #f44336;
  }
  .reject:hover {
    background-color: #da190b;
  }
`;
