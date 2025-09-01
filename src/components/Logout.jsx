import React from "react";
import { useNavigate } from "react-router-dom";
import { BiPowerOff } from "react-icons/bi";
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";

export default function Logout() {
  const navigate = useNavigate();

  const handleClick = async () => {
    try {
      const storedUser = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
      if (!storedUser) return;

      const userId = JSON.parse(storedUser)._id;
      const response = await axios.get(`${logoutRoute}/${userId}`);

      if (response.status === 200) {
        localStorage.clear(); // clear local storage
        navigate("/login");   // redirect to login page
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <Button onClick={handleClick}>
      <BiPowerOff />
    </Button>
  );
}

const Button = styled.button.attrs({ type: "button" })`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: #9a86f3;
  border: none;
  cursor: pointer;

  svg {
    font-size: 1.3rem;
    color: #ebe7ff;
  }

  &:hover {
    background-color: #7a5efc;
  }
`;
