import axios from "axios";
import React, { useEffect, useRef, useState, useCallback } from "react";
import styled from "styled-components";
import { recieveMessageRoute } from "../utils/APIRoutes";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../context/CallContext";
import { aesEncrypt, aesDecrypt } from "../utils/AES";
import Logout from "./Logout";

const AES_KEY = "defaultkey123456";

const FileIcon = ({ fileName }) => {
  if (!fileName) return <>📎</>;

  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return <>📄</>;
    case "doc":
    case "docx":
      return <>📝</>;
    case "xls":
    case "xlsx":
      return <>📊</>;
    case "ppt":
    case "pptx":
      return <>📈</>;
    case "zip":
    case "rar":
      return <>🗜️</>;
    case "mp4":
    case "mov":
    case "avi":
      return <>🎞️</>;
    default:
      return <>📎</>;
  }
};

export default function ChatContainer({ currentChat, currentUser  }) {
  const socket = useSocket();
  const { startCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [text, setText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);

  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let fileUrl = data.url || data.filename || "";
      if (fileUrl && !fileUrl.startsWith("http")) {
        fileUrl = `http://localhost:5000${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
      }

      return { url: fileUrl, name: file.name };
    } catch (err) {
      console.error("File upload error:", err);
      return null;
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!currentUser  || !currentChat || (!text.trim() && !pendingAttachment)) return;

    let attachments = [];
    if (pendingAttachment) {
      const uploadedAttachment = await uploadFile(pendingAttachment);
      if (uploadedAttachment) attachments.push(uploadedAttachment);
    }

    const encryptedText = text.trim() ? aesEncrypt(text.trim(), AES_KEY) : "";

    const messageData = {
      from: currentUser ._id,
      to: currentChat._id,
      msgText: encryptedText,
      attachments,
    };

    socket?.emit("msg-send", messageData);

    const localMessages = [
      ...(encryptedText
        ? [{ fromSelf: true, type: "text", message: text.trim(), createdAt: new Date().toISOString() }]
        : []),
      ...attachments.map((att) => ({
        fromSelf: true,
        type: "file",
        message: att.url,
        fileName: att.name,
        createdAt: new Date().toISOString(),
      })),
    ];

    setMessages((prev) => [...prev, ...localMessages]);
    setText("");
    setPendingAttachment(null);
    setShowAttachMenu(false);
  }, [text, pendingAttachment, currentUser , currentChat, socket]);

  const handleFilePicked = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingAttachment(file);
    e.target.value = "";
    setShowAttachMenu(false);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser  || !currentChat) return;

      try {
        const { data } = await axios.post(recieveMessageRoute, {
          from: currentUser ._id,
          to: currentChat._id,
        });

        const normalized = (data || [])
          .map((m) => {
            const isSelf = m.sender?.toString() === currentUser ._id;

            const attachmentMessages = (m.attachments || []).map((att) => ({
              id: att._id || att.url,
              fromSelf: isSelf,
              type: "file",
              message: att.url.startsWith("http") ? att.url : `http://localhost:5000${att.url}`,
              fileName: att.originalName || att.name || att.url.split("/").pop(),
              createdAt: m.createdAt,
            }));

            let content = m.message?.text ?? "";
            if (content) {
              try {
                content = /^[0-9a-f]+$/i.test(content) ? aesDecrypt(content, AES_KEY) : content;
              } catch {}
            }

            const textMessage = content
              ? [{ id: m._id, fromSelf: isSelf, type: "text", message: content, createdAt: m.createdAt }]
              : [];

            return [...textMessage, ...attachmentMessages];
          })
          .flat()
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        setMessages(normalized);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [currentChat, currentUser ]);

  useEffect(() => {
    if (!socket) return;

    const onMsgReceive = ({ from, msgText, attachments }) => {
      if (from !== currentChat?._id) return;

      let decryptedText = "";
      try {
        decryptedText = msgText ? aesDecrypt(msgText, AES_KEY) : "";
      } catch {
        decryptedText = msgText || "";
      }

      const incomingMessages = [
        ...(decryptedText
          ? [{ fromSelf: false, type: "text", message: decryptedText, createdAt: new Date().toISOString() }]
          : []),
        ...(attachments?.map((att) => {
          let url = "";
          let name = "";
          if (typeof att === "string") {
            url = att.startsWith("http") ? att : `http://localhost:5000/upload/${att}`;
            name = att.split("/").pop();
          } else if (att && att.url) {
            url = att.url.startsWith("http") ? att.url : `http://localhost:5000${att.url}`;
            name = att.name || att.originalName || url.split("/").pop();
          }
          return {
            fromSelf: false,
            type: "file",
            message: url,
            fileName: name,
            createdAt: new Date().toISOString(),
          };
        }) || []),
      ];

      setArrivalMessage(incomingMessages);
    };

    socket.on("msg-receive", onMsgReceive);
    return () => socket.off("msg-receive", onMsgReceive);
  }, [socket, currentChat]);

  useEffect(() => {
    if (!arrivalMessage) return;
    setMessages((prev) => [...prev, ...(Array.isArray(arrivalMessage) ? arrivalMessage : [arrivalMessage])]);
    setArrivalMessage(null);
  }, [arrivalMessage]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!currentUser  || !currentChat)
    return (
      <Empty>
        <p>Select a chat to start messaging</p>
      </Empty>
    );

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            {currentChat?.avatarImage && <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt="avatar" />}
          </div>
          <div className="username">
            <h3>{currentChat?.username}</h3>
          </div>
        </div>
        <div className="call-buttons">
          <button onClick={() => startCall(currentChat._id, false)} title="Audio Call">
            📞
          </button>
          <button onClick={() => startCall(currentChat._id, true)} title="Video Call">
            🎥
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={scrollRef} aria-live="polite">
        {messages.map((m, idx) => (
          <div key={m.id ?? idx} className={`message ${m.fromSelf ? "sended" : "recieved"}`}>
            <div className="content">
              {m.type === "text" ? (
                <p>{m.message}</p>
              ) : (
                <div className="file">
                  <a href={m.message} target="_blank" rel="noreferrer" title={m.fileName}>
                    {/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(m.message) ? (
                      <img src={m.message} alt={m.fileName} />
                    ) : (
                      <>
                        <FileIcon fileName={m.fileName} /> {m.fileName}
                      </>
                    )}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <div className="clip">
          <button onClick={() => setShowAttachMenu((v) => !v)} title="Attach file">
            📎
          </button>
          {showAttachMenu && (
            <div className="attach-menu">
              <button onClick={() => fileInputRef.current?.click()} role="menuitem">
                Select file…
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFilePicked}
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.xlsx,.ppt,.pptx"
          />
        </div>

        <input
          className="text"
          type="text"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
        />
        <button className="send" onClick={handleSendMessage} disabled={!text.trim() && !pendingAttachment}>
          ➤
        </button>
        <Logout />
      </div>

      {pendingAttachment && <div className="pending-attachments">{pendingAttachment.name}</div>}
    </Container>
  );
}

/* ===== Styles ===== */
const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  height: 100%;
  background: #121212;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #121212;

  .chat-header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background-color: #1a1b1f;
    color: #fff;
    border-bottom: 1px solid #222;
    
    .user-details {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      
      .avatar img {
        height: 2.6rem;
        width: 2.6rem;
        border-radius: 50%;
      }
      
      .username h3 {
        margin: 0;
        font-weight: 600;
      }
    }
    
    .call-buttons button {
      background: #2d6cdf;
      color: #fff;
      border: 0;
      border-radius: 6px;
      padding: 0.4rem 0.6rem;
      margin-left: 0.4rem;
      cursor: pointer;
      font-size: 1.2rem;
      line-height: 1;
      transition: background-color 0.3s;
    }
    
    .call-buttons button:hover {
      background-color: #1a4dbf;
    }
  }

  .chat-messages {
    flex: 1;
    padding: 1rem 1.25rem;
    /* Added padding bottom to avoid overlap with input */
    padding-bottom: 4.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: #0f1014;
  }
  
  .chat-messages::-webkit-scrollbar {
    width: 8px;
  }
  
  .chat-messages::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
  }

  .message {
    display: flex;
  }
  
  .sended {
    justify-content: flex-end;
  }
  
  .recieved {
    justify-content: flex-start;
  }
  
  .content {
    max-width: 70%;
    padding: 0.65rem 0.9rem;
    border-radius: 0.85rem;
    color: #fff;
    word-break: break-word;
  }
  
  .sended .content {
    background: #4e0eff;
    border-bottom-right-radius: 0.25rem;
  }
  
  .recieved .content {
    background: #2a2d33;
    border-bottom-left-radius: 0.25rem;
  }
  
  .file img {
    max-width: 280px;
    max-height: 220px;
    border-radius: 8px;
    display: block;
  }

  .chat-input {
    position: sticky;
    bottom: 0;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.9rem;
    background: #1a1b1f;
    border-top: 1px solid #222;
    z-index: 10;
  }
  
  .clip {
    position: relative;
  }
  
  .clip > button {
    background: #2d2f36;
    color: #fff;
    border: 0;
    border-radius: 6px;
    padding: 0.45rem 0.55rem;
    cursor: pointer;
    font-size: 1.2rem;
  }
  
  .clip > button:hover {
    filter: brightness(1.05);
  }
  
  .attach-menu {
    position: absolute;
    bottom: 2.8rem;
    left: 0;
    background: #20222a;
    border: 1px solid #2a2d33;
    border-radius: 8px;
    padding: 0.45rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 160px;
  }
  
  .attach-menu button {
    background: transparent;
    color: #fff;
    border: 0;
    text-align: left;
    padding: 0.4rem 0.5rem;
    cursor: pointer;
  }
  
  .attach-menu button:hover {
    background: #2a2d33;
    border-radius: 6px;
  }

  .text {
    flex: 1;
    background: #0f1014;
    border: 1px solid #2a2d33;
    color: #fff;
    border-radius: 22px;
    padding: 0.55rem 0.9rem;
    outline: none;
    font-size: 1rem;
  }
  
  .send {
    background: #d8dee7ff;
    color: #fff;
    border: 0;
    border-radius: 20px;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
    font-size: 1.2rem;
    transition: background-color 0.3s;
  }
  
  .send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pending-attachments {
    background: #1a1b1f;
    padding: 0.4rem 0.8rem;
    color: #fff;
    border-top: 1px solid #222;
  }
`;
