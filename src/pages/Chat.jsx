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
import { 
  FaVideo, 
  FaPhone, 
  FaPhoneSlash, 
  FaVolumeUp, 
  FaMicrophone,
  FaVideoSlash,
  FaCog,
  FaUser
} from "react-icons/fa";
import { MdCallEnd, MdCall, MdVideocam, MdMic } from "react-icons/md";
import { IoMdCall, IoMdVideocam } from "react-icons/io";

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
    calling,
    acceptCall,
    rejectCall,
    cancelCall,
    hangUp,
    localVideoRef,
    remoteVideoRef,
    isVideoCall,
    callerName,
    callDuration,
  } = useCall();

  // Show overlay if there's an incoming call, we're calling, or we're in a call
  if (!incomingCall && !inCall && !calling) return null;

  return (
    <Overlay>
      {isVideoCall ? (
        <VideoContainer>
          <div className="video-wrapper remote">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline
              controls={false}
              muted={false}
              className="remote-video"
              onLoadedMetadata={() => {
                console.log("📹 Remote video metadata loaded");
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.error);
                }
              }}
              onCanPlay={() => {
                console.log("📹 Remote video can play");
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.error);
                }
              }}
              onError={(e) => console.error("📹 Remote video error:", e)}
            />
            <span className="video-label">
              <FaUser size={12} />
              {callerName || 'Contact'}
            </span>
          </div>
          <div className="video-wrapper local">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted={true}
              playsInline
              controls={false}
              className="local-video"
              onLoadedMetadata={() => {
                console.log("📹 Local video metadata loaded");
                if (localVideoRef.current) {
                  localVideoRef.current.play().catch(console.error);
                }
              }}
              onCanPlay={() => {
                console.log("📹 Local video can play");
                if (localVideoRef.current) {
                  localVideoRef.current.play().catch(console.error);
                }
              }}
              onError={(e) => console.error("📹 Local video error:", e)}
            />
            <span className="video-label">
              <FaUser size={12} />
              You
            </span>
          </div>
          {inCall && (
            <div className="call-duration">
              <FaVideo size={16} />
              {callDuration}
            </div>
          )}
          {calling && (
            <div className="call-status">
              <FaVideo size={16} />
              Calling {callerName}...
            </div>
          )}
        </VideoContainer>
      ) : (
        <AudioContainer>
          <div className="audio-call-info">
            <div className="caller-avatar">
              <FaMicrophone size={40} />
            </div>
            <h2>{callerName || 'Contact'}</h2>
            <p>
              {inCall ? (
                <>
                  <FaPhone size={14} style={{ marginRight: '8px' }} />
                  Audio call - {callDuration}
                </>
              ) : calling ? (
                <>
                  <FaPhone size={14} style={{ marginRight: '8px' }} />
                  Calling {callerName}...
                </>
              ) : (
                <>
                  <FaPhone size={14} style={{ marginRight: '8px' }} />
                  Incoming audio call
                </>
              )}
            </p>
          </div>
          <audio 
            ref={localVideoRef} 
            autoPlay 
            muted={true}
            controls={false}
            style={{ display: 'none' }}
            onCanPlay={() => {
              console.log("🎤 Local audio can play");
              if (localVideoRef.current) {
                localVideoRef.current.play().catch(console.error);
              }
            }}
          />
          <audio 
            ref={remoteVideoRef} 
            autoPlay 
            muted={false}
            controls={false}
            style={{ display: 'none' }}
            onCanPlay={() => {
              console.log("🎤 Remote audio can play");
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().catch(console.error);
              }
            }}
          />
        </AudioContainer>
      )}

      <Actions>
        {incomingCall && !inCall && !calling && (
          <>
            <CallInfo>
              <p>
                {isVideoCall ? (
                  <>
                    <FaVideo size={18} style={{ marginRight: '8px' }} />
                    Incoming Video Call
                  </>
                ) : (
                  <>
                    <FaPhone size={18} style={{ marginRight: '8px' }} />
                    Incoming Audio Call
                  </>
                )}
              </p>
              <span>from {callerName || 'Contact'}</span>
            </CallInfo>
            <ButtonGroup>
              <button className="answer" onClick={acceptCall}>
                {isVideoCall ? <IoMdVideocam size={20} /> : <IoMdCall size={20} />}
                Answer
              </button>
              <button className="reject" onClick={rejectCall}>
                <MdCallEnd size={20} />
                Reject
              </button>
            </ButtonGroup>
          </>
        )}
        {calling && (
          <>
            <CallInfo>
              <p>
                {isVideoCall ? (
                  <>
                    <FaVideo size={18} style={{ marginRight: '8px' }} />
                    Video Call
                  </>
                ) : (
                  <>
                    <FaPhone size={18} style={{ marginRight: '8px' }} />
                    Audio Call
                  </>
                )}
              </p>
              <span>Calling {callerName}...</span>
            </CallInfo>
            <ButtonGroup>
              <button className="reject" onClick={cancelCall}>
                <MdCallEnd size={20} />
                Cancel
              </button>
            </ButtonGroup>
          </>
        )}
        {inCall && (
          <>
            <CallInfo>
              <p>
                {isVideoCall ? (
                  <>
                    <FaVideo size={18} style={{ marginRight: '8px' }} />
                    Video Call Active
                  </>
                ) : (
                  <>
                    <FaPhone size={18} style={{ marginRight: '8px' }} />
                    Audio Call Active
                  </>
                )}
              </p>
              <span>{callDuration}</span>
            </CallInfo>
            <ButtonGroup>
              <button className="reject" onClick={hangUp}>
                <MdCallEnd size={20} />
                End Call
              </button>
            </ButtonGroup>
          </>
        )}
      </Actions>
    </Overlay>
  );
};

// Media test button component
const MediaTestButton = () => {
  const { testMediaDevices } = useCall();

  const handleTest = async () => {
    const result = await testMediaDevices();
    alert(result ? "✅ Media devices work!" : "❌ Media devices failed - check console");
  };

  return (
    <TestButton onClick={handleTest}>
      <FaCog size={16} />
      Test Media
    </TestButton>
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
        const { data } = await axios.get(`${allUsersRoute}/${currentUser._id}`);
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
          <MediaTestButton />
          <div className="container">
            <Contacts contacts={contacts} changeChat={handleChatChange} />
            {currentChat ? (
              <ChatContainer currentChat={currentChat} currentUser={currentUser} />
            ) : (
              <Welcome />
            )}
          </div>
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

const TestButton = styled.button`
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
  padding: 10px 15px;
  background: linear-gradient(135deg, #4e0eff, #997af0);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(78, 14, 255, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(78, 14, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
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
  position: relative;
  width: 100%;
  max-width: 800px;

  .video-wrapper {
    position: relative;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 0 20px rgba(78, 14, 255, 0.3);
    background: #000;
  }

  .video-wrapper.local {
    order: 2;
  }

  .video-wrapper.remote {
    order: 1;
  }

  .local-video {
    width: 200px;
    height: 150px;
    object-fit: cover;
    border-radius: 15px;
    background: #000;
    transform: scaleX(-1);
  }

  .remote-video {
    width: 400px;
    height: 300px;
    object-fit: cover;
    border-radius: 15px;
    background: #000;
  }

  .video-label {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }

  .call-duration {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 10px 16px;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 2px solid rgba(78, 14, 255, 0.5);
  }

  .call-status {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #4e0eff, #997af0);
    color: white;
    padding: 10px 16px;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    z-index: 10;
    animation: pulse 2s infinite;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 15px rgba(78, 14, 255, 0.4);
  }

  @keyframes pulse {
    0% { opacity: 1; transform: translateX(-50%) scale(1); }
    50% { opacity: 0.8; transform: translateX(-50%) scale(1.05); }
    100% { opacity: 1; transform: translateX(-50%) scale(1); }
  }

  @media screen and (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    
    .local-video, .remote-video {
      width: 300px;
      height: 225px;
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
    padding: 50px;
    border-radius: 25px;
    border: 2px solid #4e0eff;
    backdrop-filter: blur(10px);
  }

  .caller-avatar {
    background: linear-gradient(135deg, #4e0eff, #997af0);
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 25px;
    box-shadow: 0 8px 30px rgba(78, 14, 255, 0.4);
    color: white;
  }

  h2 {
    color: white;
    margin: 0 0 15px 0;
    font-size: 1.8rem;
    font-weight: 600;
  }

  p {
    color: #b3b3b3;
    margin: 0;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
  }
`;

const Actions = styled.div`
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
`;

const CallInfo = styled.div`
  text-align: center;
  color: white;

  p {
    font-size: 1.3rem;
    margin: 0 0 8px 0;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    color: #b3b3b3;
    font-size: 1.1rem;
    font-weight: 400;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 25px;

  button {
    padding: 18px 35px;
    font-size: 1.1rem;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    color: white;
    font-weight: 600;
    transition: all 0.3s ease;
    min-width: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }

  .answer {
    background: linear-gradient(135deg, #4caf50, #45a049);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }
  
  .answer:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.5);
  }

  .answer:active {
    transform: translateY(-1px);
  }

  .reject {
    background: linear-gradient(135deg, #f44336, #da190b);
    box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
  }
  
  .reject:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(244, 67, 54, 0.5);
  }

  .reject:active {
    transform: translateY(-1px);
  }

  @media screen and (max-width: 480px) {
    flex-direction: column;
    
    button {
      min-width: 220px;
    }
  }
`;
