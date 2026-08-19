import React from "react";
import ringLogoImg from "../assets/ring-logo.png";

export default function RingLogo({ size = 32, className = "" }) {
  return (
    <div
      className={`ring-logo-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <img
        src={ringLogoImg}
        alt="One Ring"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 0 6px rgba(220, 175, 70, 0.25))",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </div>
  );
}
