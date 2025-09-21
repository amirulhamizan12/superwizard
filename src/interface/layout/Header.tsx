import React from "react";
import { MenuIcon, NewChatIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";

const Header: React.FC<{
  onClearChat: () => void;
  onToggleSidebar: () => void;
  onNewChat?: () => void;
}> = ({ onClearChat, onToggleSidebar, onNewChat }) => {
  const { colors } = useTheme();
  
  const btnStyle = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s",
    opacity: 1,
    width: "32px",
    height: "32px",
  };

  const handleMouse = (
    e: React.MouseEvent<HTMLButtonElement>,
    scale: string
  ) => {
    e.currentTarget.style.transform = scale;
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "0 8px",
        backgroundColor: colors.app.primary,
        height: "48px",
        position: "sticky",
        top: 0,
        zIndex: 20,
        overflow: "visible",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          position: "relative",
          zIndex: 21,
        }}
      >
        <button
          aria-label="Open sidebar"
          style={{ ...btnStyle, marginRight: "8px" }}
          onMouseDown={(e) => handleMouse(e, "scale(0.9)")}
          onMouseUp={(e) => handleMouse(e, "scale(1)")}
          onMouseLeave={(e) => handleMouse(e, "scale(1)")}
          onClick={onToggleSidebar}
        >
          <MenuIcon w="23px" h="23px" />
        </button>

        <div style={{ flex: 1 }} />

        <img
          src={require("../../assets/img/Superwizard.svg")}
          alt="Superwizard"
          style={{
            height: "26.4px",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
          draggable={false}
        />

        <div style={{ flex: 1 }} />

        <button
          aria-label="New chat"
          style={{ ...btnStyle, marginLeft: "8px" }}
          onMouseDown={(e) => handleMouse(e, "scale(0.9)")}
          onMouseUp={(e) => handleMouse(e, "scale(1)")}
          onMouseLeave={(e) => handleMouse(e, "scale(1)")}
          onClick={onNewChat || onClearChat}
        >
          <NewChatIcon w="23px" h="23px" />
        </button>
      </div>
    </div>
  );
};

export default Header;
