import React from "react";
import styled, { keyframes } from "styled-components";
import App from "./App";

const Input = styled.input`
  height: 0;
  width: 0;
  opacity: 0;
  z-index: -1;
`;

const Label = styled.label`
  position: relative;
  display: inline-block;
  font-size: ${props => {
    if (props.size === "xs") return "6px";
    if (props.size === "sm") return "8px";
    if (props.size === "lg") return "12px";

    return "10px";
  }};
  width: 6em;
  height: 3.4em;

  cursor: ${props => (props.disabled ? "not-allowed" : "pointer")};

  ${Input} {
    opacity: 0;
    width: 0;
    height: 0;
  }
`;

const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  -webkit-transition: 0.4s;
  transition: 0.4s;
  border-radius: 5px;
  border: 1px solid white;

  &::before {
    position: absolute;
    content: url("../public/img/stationery.png");
    height: 2.8em;
    width: 2.8em;
    left: 0.3em;
    bottom: 0.24em;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
    border-radius: 5px;
  }

  ${Input}:checked + & {
    background-color:  #162636;
  }

  ${Input}:checked + &::before {
    -webkit-transform: translateX(2.6em);
    -ms-transform: translateX(2.6em);
    transform: translateX(2.6em);
  }

  ${Input}:focus + & {
    box-shadow: 0 0 0.1em #2196f3;
  }

  ${Input}:disabled + & {
    pointer-events: none;
    background: #e6e6e6;
  }
`;

export default function CustomControl({
  isChecked,
  setIsChecked,
  onClick,
}) {

    return(
      <Label>
        <Input type="checkbox" 
        checked={isChecked} 
        onClick={onClick} 
        onChange={(event) => setIsChecked(event.currentTarget.checked)}/>
          <Slider />
      </Label>
  )
}

