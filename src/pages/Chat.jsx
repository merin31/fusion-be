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

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

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
    isVideoCall,
    callerName,
  } = useCall();

  if (!incomingCall && !inCall) return null;

  return (
    <Overlay>
      {isVideoCall ? (
        <VideoContainer>
          <div className="video-wrapper">
            <video ref={localVideoRef} autoPlay muted className="local-video" />
            <span className="video-label">You</span>
          </div>
          <div className="video-wrapper">
            <video ref={remoteVideoRef} autoPlay className="remote-video" />
            <span className="video-label">{callerName || 'Contact'}</span>
          </div>
        </VideoContainer>
      ) : (
        <AudioContainer>
          <div className="audio-call-info">
            <div className="caller-avatar">
              🎵
            </div>
            <h2>{callerName || 'Contact'}</h2>
            <p>{inCall ? 'Audio call in progress...' : 'Incoming audio call'}</p>
          </div>
          <audio ref={localVideoRef} autoPlay muted />
          <audio ref={remoteVideoRef} autoPlay />
        </AudioContainer>
      )}

      <Actions>
        {incomingCall && !inCall && (
          <>
            <CallInfo>
              <p>{isVideoCall ? 'Incoming Video Call' : 'Incoming Audio Call'}</p>
              <span>from {callerName || 'Contact'}</span>
            </CallInfo>
            <ButtonGroup>
              <button className="answer" onClick={acceptCall}>
                {isVideoCall ? '📹' : '📞'} Answer
              </button>
              <button className="reject" onClick={rejectCall}>
                ❌ Reject
              </button>
            </ButtonGroup>
          </>
        )}
        {inCall && (
          <>
            <CallInfo>
              <p>{isVideoCall ? 'Video Call Active' : 'Audio Call Active'}</p>
            </CallInfo>
            <ButtonGroup>
              <button className="reject" onClick={hangUp}>
                📞 End Call
              </button>
            </ButtonGroup>
          </>
        )}
      </Actions>
    </Overlay>
  );
};

export default function Chat() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const LOCAL_KEY = process.env.REACT_APP_LOCALHOST_KEY || "chat-app-user";

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem(LOCAL_KEY);
    if (!storedUser) {
      navigate("/login");
    } else {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, [navigate, LOCAL_KEY]);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) return;

      if (!currentUser.isAvatarImageSet) {
        navigate("/setAvatar");
        return;
      }

      try {
        const { data } = await axios.get(`${SERVER_URL}${allUsersRoute}/${currentUser._id}`);
        setContacts(data.filter((user) => user._id !== currentUser._id));
      } catch (err) {
        console.error("❌ Error fetching contacts:", err);
      }
    };

    fetchContacts();
  }, [currentUser, navigate]);

  const handleChatChange = (chat) => setCurrentChat(chat);

  if (!currentUser) {
    return (
      <LoadingContainer>
        <div className="spinner" />
        <p>Loading...</p>
      </LoadingContainer>
    );
  }

  return (
    <SocketProvider currentUser={currentUser}>
      <CallProvider currentUser={currentUser}>
        <Container>
          <div className="container">
            <Contacts contacts={contacts} changeChat={handleChatChange} />
            {currentChat ? (
              <ChatContainer currentChat={currentChat} currentUser={currentUser} />
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
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
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
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const VideoContainer = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;

  .video-wrapper {
    position: relative;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 0 20px rgba(78, 14, 255, 0.3);
  }

  .local-video {
    width: 200px;
    height: 150px;
    object-fit: cover;
    border-radius: 15px;
  }

  .remote-video {
    width: 400px;
    height: 300px;
    object-fit: cover;
    border-radius: 15px;
  }

  .video-label {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  @media screen and (max-width: 768px) {
    flex-direction: column;
    
    .local-video, .remote-video {
      width: 280px;
      height: 210px;
    }
  }
`;

const AudioContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .audio-call-info {
    background: rgba(78, 14, 255, 0.1);
    padding: 40px;
    border-radius: 20px;
    border: 2px solid #4e0eff;
  }

  .caller-avatar {
    font-size: 4rem;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #4e0eff, #997af0);
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  h2 {
    color: white;
    margin: 0 0 10px 0;
    font-size: 1.5rem;
  }

  p {
    color: #b3b3b3;
    margin: 0;
    font-size: 1rem;
  }
`;

const Actions = styled.div`
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const CallInfo = styled.div`
  text-align: center;
  color: white;

  p {
    font-size: 1.2rem;
    margin: 0 0 5px 0;
    font-weight: bold;
  }

  span {
    color: #b3b3b3;
    font-size: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;

  button {
    padding: 15px 30px;
    font-size: 1rem;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    color: white;
    font-weight: bold;
    transition: all 0.3s ease;
    min-width: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .answer {
    background: linear-gradient(135deg, #4caf50, #45a049);
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  }
  
  .answer:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }

  .reject {
    background: linear-gradient(135deg, #f44336, #da190b);
    box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
  }
  
  .reject:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
  }

  @media screen and (max-width: 480px) {
    flex-direction: column;
    
    button {
      min-width: 200px;
    }
  }
`;
