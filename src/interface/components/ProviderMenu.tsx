import React, { useState, useEffect, useRef, useCallback } from "react";
import { PlusIcon, getProviderIcon } from "../styles/Icons";
import { ProviderTemplate } from "../../wizardry/ai/endpoint/templates";
import { useTheme } from "../styles/theme";

// ============================================================================
// SHARED STYLES
// ============================================================================

const baseStyle = {
  letterSpacing: "0.06em",
  fontFamily: "Geist",
  fontSize: 12,
};

const btnStyle = {
  ...baseStyle,
  background: "none",
  border: "none",
  cursor: "pointer",
  borderRadius: "8px",
  transition: "background 0.2s",
};

// ============================================================================
// COMPONENT INTERFACE
// ============================================================================

interface AddProviderMenuProps {
  availableProviders: ProviderTemplate[];
  isCompact?: boolean;
  onProviderSelect: (id: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AddProviderMenu = React.memo(({
  availableProviders,
  isCompact = false,
  onProviderSelect,
}: AddProviderMenuProps) => {
  if (!availableProviders.length) return null;

  // --------------------------------------------------------------------------
  // STATE & REFS
  // --------------------------------------------------------------------------
  
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [menuPosition, setMenuPosition] = useState<"left" | "right">("left");
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { colors, shadows } = useTheme();

  // --------------------------------------------------------------------------
  // COMPUTED STYLES
  // --------------------------------------------------------------------------
  
  const cardStyle = {
    ...baseStyle,
    background: colors.app.primary,
    borderRadius: "20px",
    border: `1px solid ${colors.border.primary}`,
    boxShadow: shadows.md,
  };

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (showMenu) {
      setIsVisible(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true))
      );
    } else if (isVisible) {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 220);
    }
  }, [showMenu, isVisible]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const toggleMenu = useCallback(() => {
    setShowMenu((v) => {
      if (!v && menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const dropdownWidth = 285;
        setMenuPosition(
          window.innerWidth - rect.left < dropdownWidth && rect.right > dropdownWidth
            ? "right"
            : "left"
        );
      }
      return !v;
    });
  }, []);

  // --------------------------------------------------------------------------
  // RENDER CONTENT
  // --------------------------------------------------------------------------

  const content = isCompact ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <PlusIcon w="19px" h="19px" style={{ color: colors.text.primary }} />
      <p style={{ color: colors.text.primary, fontSize: 13, fontWeight: 500, margin: 0 }}>
        Add New Provider
      </p>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <PlusIcon w="19px" h="19px" style={{ color: colors.text.primary }} />
      <p style={{ color: colors.text.primary, textAlign: "center", fontSize: 13, margin: 0, userSelect: "none" }}>
        No providers configured yet. Add a provider to get started.
      </p>
    </div>
  );

  return (
    <div
      ref={menuRef}
      style={{
        ...cardStyle,
        background: isHovered ? colors.app.hover : colors.app.primary,
        transition: "background 0.2s",
        cursor: "pointer",
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ padding: isCompact ? 15 : 30, ...baseStyle }} onClick={toggleMenu}>
        {content}
      </div>
      {isVisible && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            ...(menuPosition === "left" ? { left: 0 } : { right: 0 }),
            ...cardStyle,
            zIndex: 10,
            minWidth: 190,
            maxWidth: 285,
            padding: 8,
            opacity: isAnimating ? 1 : 0,
            transform: `translateY(${isAnimating ? 0 : -12}px) scale(${isAnimating ? 1 : 0.98})`,
            pointerEvents: isAnimating ? "auto" : "none",
            transition: "opacity 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {availableProviders.map((template) => {
            const Icon = getProviderIcon(template.id);
            return (
              <button
                key={template.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  ...btnStyle,
                  width: "100%",
                  textAlign: "left",
                  transition: "transform 0.18s cubic-bezier(.4,1.2,.6,1)",
                  willChange: "transform",
                }}
                onClick={() => {
                  onProviderSelect(template.id);
                  setShowMenu(false);
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {Icon && <Icon w="15px" h="15px" />}
                  <p style={{ fontWeight: 500, fontSize: 13, color: colors.text.primary, margin: 0 }}>
                    {template.displayName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default AddProviderMenu;
