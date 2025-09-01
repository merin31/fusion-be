import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";

export default function Contacts({ contacts, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  useEffect(() => {
    const loadUser = async () => {
      const data = await JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      setCurrentUserName(data.username);
      setCurrentUserImage(data.avatarImage);
    };
    loadUser();
  }, []);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    if (contact) changeChat(contact); // pass full contact object
  };

  return (
    <>
      {currentUserImage && currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h3>XChat</h3>
          </div>

          <div className="contacts">
            {contacts.map((contact, index) => (
              <div
                key={contact._id}
                className={`contact ${
                  index === currentSelected ? "selected" : ""
                }`}
                onClick={() => changeCurrentChat(index, contact)}
              >
                <div className="avatar">
                  <img
                    src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                    alt="avatar"
                  />
                </div>
                <div className="username">
                  <h3>{contact.username}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="current-user">
            <div className="avatar">
              <img
                src={`data:image/svg+xml;base64,${currentUserImage}`}
                alt="avatar"
              />
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  overflow: hidden;
  width: 300px; 
  grid-template-rows: 10% 1fr 5rem; 
  background-color: #080420;
  min-height: 0;   /* ✅ allow children (contacts) to shrink */

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img {
      height: 2rem;
    }
    h3 {
      color: white;
      text-transform: uppercase;
    }
  }

  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    overflow-y: auto;  /* ✅ scroll only this section */
    min-height: 0;     /* ✅ critical for grid children */

    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }

    .contact {
      background-color: #ffffff34;
      min-height: 5rem;
      cursor: pointer;
      width: 90%;
      border-radius: 0.2rem;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.5s ease-in-out;
      overflow: hidden;   /* ✅ keeps children inside */

      .avatar img {
        height: 3rem;
      }

      .username {
        flex: 1;          /* ✅ take remaining space */
        min-width: 0;     /* ✅ required for ellipsis */
      }

      .username h3 {
        color: white;
        font-size: 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;  /* ✅ truncate long usernames */
      }
    }

    .selected {
      background-color: #9a86f3;
    }
  }

  .current-user {
    background-color: #0d0d30;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    height: 5rem;            /* fixed height to prevent expansion */
    min-height: 0;           /* allow shrink if needed */
    overflow: hidden;        /* prevent internal content from pushing height */

    .avatar img {
      height: 4rem;
      max-width: 100%;   /* ensures it doesn't overflow */
      object-fit: contain;
    }

    .username {
      flex: 1;
      min-width: 0;
    }

    .username h2 {
      color: white;
      font-size: 1rem;   /* cap size */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;  /* prevent text from expanding row */
    }

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username h2 {
        font-size: 1rem;
      }
    }
  }
`;


