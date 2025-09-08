import React, { useState, useEffect } from "react";
import { useAppState } from "../../state";
import {
  ApiIcon,
  GithubIcon,
  ToolsIcon,
  ViewIcon,
  UserCircleIcon,
} from "../styles/Icons";
import { colors } from "../styles/theme";

const OptionMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true))
      );
    } else if (isVisible) {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen, isVisible]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.48)",
          backdropFilter: "blur(4px)",
          zIndex: 999999,
          opacity: isAnimating ? 1 : 0,
          transition: "opacity 0.3s ease, backdrop-filter 0.3s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          zIndex: 1000000,
          maxWidth: "700px",
          width: "100%",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          transform: `translateX(-50%) translateY(${isAnimating ? 0 : 100}%)`,
        }}
      >
        <div
          style={{
            background: colors.background.primary,
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
            minHeight: "440px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "20px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

const ToggleSwitch = ({
  isOn,
  onToggle,
}: {
  isOn: boolean;
  onToggle: () => void;
}) => (
  <div
    onClick={onToggle}
    style={{
      width: "44px",
      height: "24px",
      backgroundColor: isOn ? colors.primary.main : colors.border.secondary,
      borderRadius: "12px",
      position: "relative",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
    }}
  >
    <div
      style={{
        width: "20px",
        height: "20px",
        backgroundColor: colors.background.primary,
        borderRadius: "50%",
        position: "absolute",
        top: "2px",
        left: "2px",
        transition: "transform 0.2s ease",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        transform: isOn ? "translateX(20px)" : "translateX(0)",
      }}
    />
  </div>
);


const OptionMenuContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const {
    setCurrentView,
    chatViewMode,
    setChatViewMode,
    screenVisionEnabled,
    setScreenVisionEnabled,
  } = useAppState((state) => ({
    setCurrentView: state.settings.actions.setCurrentView,
    chatViewMode: state.settings.chatViewMode,
    setChatViewMode: state.settings.actions.setChatViewMode,
    screenVisionEnabled: state.settings.screenVisionEnabled,
    setScreenVisionEnabled: state.settings.actions.setScreenVisionEnabled,
  }));

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const f = "Geist, sans-serif"; // Font family shorthand
  const baseStyle = { fontFamily: f, letterSpacing: "0.06em", fontWeight: 400 };

  const options = [
    {
      icon: UserCircleIcon,
      text: "Profile",
      action: () => {
        setCurrentView('userInfo');
        onClose?.();
      },
    },
    {
      icon: ApiIcon,
      text: "API Keys",
      action: () => {
        setCurrentView('apiConfig');
        onClose?.();
      },
    },
    {
      icon: GithubIcon,
      text: "About",
      action: () => {
        window.open(
          "https://github.com/amirulhamizan12/superwizard-ai",
          "_blank"
        );
        onClose?.();
      },
    },
  ];

  const items = [
    {
      icon: ToolsIcon,
      text: "Developer Mode",
      control: (
        <ToggleSwitch
          isOn={chatViewMode === "dev"}
          onToggle={() =>
            setChatViewMode(chatViewMode === "dev" ? "direct" : "dev")
          }
        />
      ),
    },
    {
      icon: ViewIcon,
      text: "Screen Vision",
      control: (
        <ToggleSwitch
          isOn={!!screenVisionEnabled}
          onToggle={() => setScreenVisionEnabled(!screenVisionEnabled)}
        />
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {options.map(({ icon: Icon, text, action }, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 12px",
              background:
                hoveredCard === i
                  ? colors.background.hover
                  : colors.background.card,
              border: `1px solid ${colors.border.secondary}`,
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              minHeight: "60px",
              aspectRatio: "1.2",
              ...baseStyle,
            }}
            onClick={action}
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ color: colors.text.primary, marginBottom: "4px" }}>
              <Icon style={{ width: "20px", height: "20px" }} />
            </div>
            <div
              style={{
                fontSize: "13px",
                color: colors.text.primary,
                textAlign: "center",
                lineHeight: "1.2",
                ...baseStyle,
              }}
            >
              {text}
            </div>
          </div>
        ))}
      </div>
      <div>
        {items.map(({ icon: Icon, text, control }, i) => (
          <div key={i} style={{ margin: "0 -20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom:
                  i === items.length - 1
                    ? "none"
                    : `1px solid ${colors.background.tertiary}`,
                cursor: "pointer",
                minHeight: "60px",
                transition: "all 0.2s ease",
                background:
                  hoveredItem === i ? colors.background.hover : undefined,
                paddingLeft: 20,
                paddingRight: 20,
                ...baseStyle,
              }}
              onMouseEnter={() => setHoveredItem(i)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Icon
                  style={{
                    color: colors.text.muted,
                    width: "20px",
                    height: "20px",
                  }}
                />
                <div
                  style={{
                    fontSize: "15px",
                    color: colors.text.primary,
                    ...baseStyle,
                  }}
                >
                  {text}
                </div>
              </div>
              {control}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { OptionMenu, OptionMenuContent };
