import React, { useState, useEffect } from "react";
import { useAppState } from "../../state";
import { ApiIcon, GithubIcon, UserCircleIcon, MoonIcon, DevelopIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";

// ============================================================================
// OPTION MENU MODAL
// ============================================================================

const OptionMenu: React.FC<{ isOpen: boolean; onClose: () => void; children?: React.ReactNode }> = ({ 
  isOpen, 
  onClose, 
  children 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(true)));
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

  const overlayStyle = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 999999,
    opacity: isAnimating ? 1 : 0,
    transition: "opacity 0.3s ease, backdrop-filter 0.3s ease",
  };

  const modalStyle = {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    zIndex: 1000000,
    maxWidth: "700px",
    width: "100%",
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    transform: `translateX(-50%) translateY(${isAnimating ? 0 : 100}%)`,
  };

  const contentStyle = {
    background: colors.app.primary,
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    boxShadow: "0 -8px 32px rgba(0,0,0,0.06)",
    minHeight: "440px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  };

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={modalStyle}>
        <div style={contentStyle}>
          <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// TOGGLE SWITCH COMPONENT
// ============================================================================

const ToggleSwitch = ({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) => {
  const { colors } = useTheme();
  
  const containerStyle = {
    width: "44px",
    height: "24px",
    backgroundColor: isOn ? colors.brand.main : colors.border.primary,
    borderRadius: "12px",
    position: "relative" as const,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };

  const knobStyle = {
    width: "20px",
    height: "20px",
    backgroundColor: colors.app.primary,
    borderRadius: "50%",
    position: "absolute" as const,
    top: "2px",
    left: "2px",
    transition: "transform 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transform: isOn ? "translateX(20px)" : "translateX(0)",
  };

  return (
    <div onClick={onToggle} style={containerStyle}>
      <div style={knobStyle} />
    </div>
  );
};

// ============================================================================
// OPTION MENU CONTENT
// ============================================================================

const OptionMenuContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const {
    setCurrentView,
    darkMode,
    setDarkMode,
    isAuthenticated,
    chatView,
    setChatView,
  } = useAppState((state) => ({
    setCurrentView: state.settings.actions.setCurrentView,
    darkMode: state.settings.darkMode,
    setDarkMode: state.settings.actions.setDarkMode,
    isAuthenticated: state.auth.isAuthenticated,
    chatView: state.settings.chatView,
    setChatView: state.settings.actions.setChatView,
  }));

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const { colors } = useTheme();


  const baseStyle = { fontFamily: "Geist, sans-serif", letterSpacing: "0.06em", fontWeight: 400 };

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
    isAuthenticated
      ? {
          icon: GithubIcon,
          text: "About",
          action: () => {
            window.open("https://www.superwizard.ai/about");
            onClose?.();
          },
        }
      : {
          icon: UserCircleIcon,
          text: "Login",
          action: () => {
            window.open('https://www.superwizard.ai/auth/login');
            onClose?.();
          },
        },
  ];

  const items = [
    {
      icon: MoonIcon,
      text: "Dark Mode",
      control: <ToggleSwitch isOn={!!darkMode} onToggle={() => setDarkMode(!darkMode)} />,
    },
    {
      icon: DevelopIcon,
      text: "Developer Mode",
      control: <ToggleSwitch isOn={chatView === 'developer'} onToggle={() => setChatView(chatView === 'developer' ? 'basic' : 'developer')} />,
    },
  ];

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
    marginBottom: "16px",
  };

  const cardStyle = (i: number) => ({
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "16px 12px",
    background: hoveredCard === i ? colors.app.hover : colors.app.primary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minHeight: "50px",
    aspectRatio: "1.2",
    ...baseStyle,
  });

  const itemStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "none",
    cursor: "pointer",
    minHeight: "50px",
    transition: "all 0.2s ease",
    paddingLeft: 20,
    paddingRight: 20,
    ...baseStyle,
  };

  return (
    <div>
      <div style={gridStyle}>
        {options.map(({ icon: Icon, text, action }, i) => (
          <div
            key={i}
            style={cardStyle(i)}
            onClick={action}
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ color: colors.text.primary, marginBottom: "4px" }}>
              <Icon style={{ width: "20px", height: "20px" }} />
            </div>
            <div style={{ fontSize: "13px", color: colors.text.primary, textAlign: "center", lineHeight: "1.2", ...baseStyle }}>
              {text}
            </div>
          </div>
        ))}
      </div>
      <div>
        {items.map(({ icon: Icon, text, control }, i) => (
          <div key={i} style={{ margin: "0 -20px" }}>
            <div style={itemStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Icon style={{ color: colors.text.muted, width: "20px", height: "20px" }} />
                <div style={{ fontSize: "15px", color: colors.text.primary, ...baseStyle }}>
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
