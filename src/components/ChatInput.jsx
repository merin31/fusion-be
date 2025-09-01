import Picker from "emoji-picker-react";
import React, { useState, useRef, useEffect } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import styled from "styled-components";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
    inputRef.current.focus();
  };

  // Add emoji to message
  const handleEmojiClick = (event, emojiObject) => {
    setMsg(prev => prev + emojiObject.emoji);
    inputRef.current.focus();
  };

  // Add selected files
  const handleFileChange = e => {
    const newFiles = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = null; // allow re-upload of same file
  };

  // Remove a file
  const removeFile = index => {
    URL.revokeObjectURL(files[index].preview); // clean up memory
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const sendChat = e => {
    e.preventDefault();
    if (!msg.trim() && files.length === 0) return;

    handleSendMsg({ text: msg, files: files.map(f => f.file) });

    setMsg("");
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (!e.target.closest(".emoji")) setShowEmojiPicker(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill onClick={toggleEmojiPicker} />
          {showEmojiPicker && <Picker onEmojiClick={handleEmojiClick} />}
        </div>
      </div>

      <form className="input-container" onSubmit={sendChat}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={msg}
          onChange={e => setMsg(e.target.value)}
          autoComplete="off"
        />
        <input
          type="file"
          onChange={handleFileChange}
          multiple
          className="file-input"
        />
        <button type="submit">
          <IoMdSend />
        </button>
      </form>

      {files.length > 0 && (
        <div className="file-preview">
          {files.map((f, index) => (
            <div key={index} className="file-item">
              {f.file.type.startsWith("image/") ? (
                <img src={f.preview} alt={f.file.name} />
              ) : (
                <span>{f.file.name}</span>
              )}
              <button type="button" onClick={() => removeFile(index)}>x</button>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 5% 95%;
  background-color: #080420;
  padding: 0 2rem;
  position: relative;

  .button-container {
    display: flex;
    align-items: center;
    color: white;
    gap: 1rem;

    .emoji {
      position: relative;
      svg { font-size: 1.5rem; color: #ffff00c8; cursor: pointer; }
      .emoji-picker-react {
        position: absolute;
        bottom: 60px;
        left: 0;
        z-index: 10;
        background-color: #080420;
        box-shadow: 0 5px 15px #9a86f3;
      }
    }
  }

  .input-container {
    width: 100%;
    border-radius: 2rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #ffffff34;
    padding: 0.5rem 1rem;

    input[type="text"] {
      width: 100%;
      background-color: transparent;
      color: white;
      border: none;
      font-size: 1.1rem;
      &:focus { outline: none; }
    }

    .file-input { cursor: pointer; color: white; }

    button {
      padding: 0.3rem 1rem;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #9a86f3;
      border: none;
      cursor: pointer;
      svg { color: white; }
      &:hover { background-color: #7f3ff2; }
    }
  }

  .file-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.3rem;

    .file-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      background: #1e1e2f;
      padding: 0.3rem 0.5rem;
      border-radius: 0.5rem;

      img { width: 40px; height: 40px; object-fit: cover; border-radius: 0.3rem; }
      button {
        background: red;
        border: none;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        cursor: pointer;
        font-size: 0.8rem;
      }
      span { color: white; font-size: 0.85rem; }
    }
  }
`;
