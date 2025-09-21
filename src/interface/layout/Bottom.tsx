import React, { useState, useImperativeHandle, useRef, useEffect } from "react";
import ResizeTextarea from "react-textarea-autosize";
import { useAppState } from "../../state";
import { getFriendlyModelName, getAuthenticatedModels, getUserConfiguredProviders } from "../../wizardry/ai/endpoint/userConfig";
import { SettingsIcon, ChevronDownIcon, CloseIcon } from "../styles/Icons";
import ModelDropdown from "../components/ModelDropdown";
import TabSelector, { TabInfo } from "../components/TabSelector";
import { useTheme } from "../styles/theme";

// ============================================================================
// SHARED STYLES
// ============================================================================

const txt = { fontFamily: "Geist, sans-serif", letterSpacing: "0.06em" };

const createBtn = (colors: any) => ({
  border: "none",
  background: colors.app.bottombtn,
  color: colors.app.buttonicn,
  borderRadius: "24px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
});

// ============================================================================
// TEXT INPUT COMPONENT
// ============================================================================

const TextInput = React.forwardRef<
  HTMLTextAreaElement,
  {
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    maxRows?: number;
    autoFocus?: boolean;
  }
>((props, ref) => {
  const disabled = useAppState((s) => s.taskManager.status === "running");
  const { colors } = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = "custom-placeholder-color";
      let el = document.getElementById(id) as HTMLStyleElement;
      if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = `.superwizard-input::placeholder{color:${colors.text.disabled}!important;font-weight:500!important}.superwizard-input::-webkit-scrollbar{display:none}`;
    }
  }, [colors.text.disabled]);

  return (
    <ResizeTextarea
      ref={ref}
      minRows={1}
      maxRows={props.maxRows || 15}
      className="superwizard-input"
      {...props}
      style={{
        border: "none",
        padding: "8px",
        color: disabled ? colors.text.disabled : colors.app.buttonicn,
        fontWeight: 500,
        fontSize: "15px",
        width: "100%",
        lineHeight: "1.4",
        resize: "none",
        outline: "none",
        background: "transparent",
        ...txt,
        overflow: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        opacity: disabled ? 0.7 : 1,
      }}
    />
  );
});

// ============================================================================
// SEND BUTTON COMPONENT
// ============================================================================

const SendButton: React.FC<{ onSend?: () => void; onStop?: () => void }> = ({
  onSend,
  onStop,
}) => {
  const { status, runTask, interrupt, instructions, setInstructions } =
    useAppState((s) => ({
      status: s.taskManager.status,
      runTask: s.taskManager.actions.runTask,
      interrupt: s.taskManager.actions.interrupt,
      instructions: s.settings.instructions,
      setInstructions: s.settings.actions.setInstructions,
    }));
  const { colors } = useTheme();

  const running = status === "running";
  const canSend = !running && instructions?.trim();

  const handleClick = async () => {
    if (running) {
      await interrupt();
      onStop?.();
    } else if (canSend) {
      runTask();
      setInstructions("");
      // Clear selected tab after starting task (optional - keep commented if you want to keep the selection)
      // useAppState.getState().settings.actions.setSelectedTab(null);
      onSend?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        ...createBtn(colors),
        width: "70px",
        height: "36px",
        borderRadius: "12px",
        fontWeight: "600",
        fontSize: "14px",
        opacity: 1,
        cursor: canSend || running ? "pointer" : "not-allowed",
      }}
    >
      {running ? (
        <CloseIcon style={{ width: "20px", height: "20px" }} />
      ) : (
        <span
          style={{
            fontWeight: "300",
            fontSize: "18px",
            fontFamily: "'Roca One', sans-serif",
            color: canSend ? colors.app.buttonicn : colors.text.disabled,
            WebkitTextStroke: `0.1px ${
              canSend ? colors.app.buttonicn : colors.text.disabled
            }`,
            transform: "translateY(2px)",
            letterSpacing: "0.06em",
          }}
        >
          Send
        </span>
      )}
    </button>
  );
};

// ============================================================================
// BOTTOM COMPONENT
// ============================================================================

export interface BottomRef {
  focusInput: () => void;
}

const Bottom = React.forwardRef<
  BottomRef,
  {
    handleKeyDown: (e: React.KeyboardEvent) => void;
    onOpenOptionsMenu: () => void;
  }
>(({ handleKeyDown, onOpenOptionsMenu }, ref) => {
  const {
    instructions,
    setInstructions,
    selectedModel,
    configuredProviders,
    taskStatus,
    selectedTab,
    setSelectedTab,
  } = useAppState((s) => ({
    instructions: s.settings.instructions,
    setInstructions: s.settings.actions.setInstructions,
    selectedModel: s.settings.selectedModel,
    configuredProviders: s.settings.configuredProviders,
    taskStatus: s.taskManager.status,
    selectedTab: s.settings.selectedTab,
    setSelectedTab: s.settings.actions.setSelectedTab,
    updateSettings: s.settings.actions.update,
    isAuthenticated: s.auth.isAuthenticated,
  }));
  const { colors, shadows } = useTheme();

  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [menuAnimating, setMenuAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [tabSelectorPosition, setTabSelectorPosition] = useState({ top: 0, left: 0 });
  const animRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
        inputRef.current.scrollTop = inputRef.current.scrollHeight;
      }
    },
  }));

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (modelMenuOpen) {
      setMenuAnimating(false);
      setShowMenu(true);
      animRef.current = requestAnimationFrame(() => {
        animRef.current = requestAnimationFrame(() => {
          setMenuAnimating(true);
        });
      });
    } else if (showMenu) {
      setMenuAnimating(false);
      timerRef.current = setTimeout(() => setShowMenu(false), 300);
    }
  }, [modelMenuOpen, showMenu]);

  // Ensure a default model is selected on first load so the label is never blank
  useEffect(() => {
    const hasNoSelection = !selectedModel || selectedModel.trim() === "";
    if (!hasNoSelection) return;

    const validProviders = getUserConfiguredProviders(configuredProviders);
    const authModels = getAuthenticatedModels();

    const createModelKey = (modelId: string, source: string) => `${source}:${modelId}`;

    let firstModelKey: string | null = null;
    if (useAppState.getState().auth.isAuthenticated && authModels.length > 0) {
      firstModelKey = createModelKey(authModels[0].id, "server");
    } else if (validProviders.length > 0 && validProviders[0].models.length > 0) {
      firstModelKey = createModelKey(validProviders[0].models[0].id, validProviders[0].id);
    } else if (authModels.length > 0) {
      firstModelKey = createModelKey(authModels[0].id, "server");
    }

    if (firstModelKey) {
      useAppState.getState().settings.actions.update({ selectedModel: firstModelKey });
    }
  }, [selectedModel, configuredProviders]);

  // Handle tab selection
  const handleTabSelect = (tab: TabInfo) => {
    setSelectedTab(tab);
    setShowTabSelector(false);
  };

  // Handle input change to detect "@"
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInstructions(value);

    // Check if user typed "@" at the end
    if (value.endsWith('@') && inputRef.current) {
      // Calculate position for dropdown - position it above the input area
      const rect = inputRef.current.getBoundingClientRect();
      const bottomBarRect = inputRef.current.closest('[style*="bottom: 0"]')?.getBoundingClientRect();
      
      setTabSelectorPosition({
        top: bottomBarRect ? window.innerHeight - bottomBarRect.top : rect.top,
        left: 20, // 20px from left edge for better centering
      });
      setShowTabSelector(true);
      // Remove the "@" character
      setInstructions(value.slice(0, -1));
    }
  };

  const btn = createBtn(colors);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: colors.app.bottombkg,
          padding: "14px 10px 10px 10px",
          boxShadow: shadows.bottom,
          borderRadius: "32px 32px 0 0",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Selected Tab Chip */}
          {selectedTab && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                background: colors.app.secondary,
                borderRadius: "8px",
                border: `1px solid ${colors.border.primary}`,
                width: "fit-content",
                maxWidth: "300px",
              }}
            >
              {/* Favicon */}
              {selectedTab.favIconUrl && (
                <img
                  src={selectedTab.favIconUrl}
                  alt=""
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "2px",
                  }}
                />
              )}
              {/* Tab title */}
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: colors.text.primary,
                  fontFamily: "Geist, sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {selectedTab.title}
              </span>
              {/* Remove button */}
              <button
                onClick={() => setSelectedTab(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.text.tertiary,
                }}
              >
                <CloseIcon style={{ width: "12px", height: "12px" }} />
              </button>
            </div>
          )}
          
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              background: colors.app.bottombkg,
            }}
          >
            <TextInput
              ref={inputRef}
              autoFocus
              placeholder={selectedTab ? `Run task on "${selectedTab.title}"...` : "Chat with Superwizard"}
              value={instructions || ""}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (instructions?.trim() && taskStatus !== "running") {
                    const { runTask } =
                      useAppState.getState().taskManager.actions;
                    runTask();
                    setInstructions("");
                    // Clear selected tab after starting task
                    // setSelectedTab(null);
                  }
                }
              }}
              maxRows={15}
            />
          </div>
          
          {/* Tab Selector */}
          {showTabSelector && (
            <TabSelector
              position={tabSelectorPosition}
              onSelect={handleTabSelect}
              onClose={() => setShowTabSelector(false)}
            />
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={onOpenOptionsMenu}
                style={{ ...btn, width: "36px", height: "36px", minWidth: "36px" }}
              >
                <SettingsIcon style={{ width: "22px", height: "22px" }} />
              </button>
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  onClick={() => setModelMenuOpen(!modelMenuOpen)}
                  style={{
                    ...btn,
                    width: "auto",
                    height: "24px",
                    minWidth: "100px",
                    maxWidth: "220px",
                    color: colors.brand.main,
                    padding: "0 4px 0 6px",
                    position: "relative",
                    zIndex: 1001,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: colors.brand.main,
                        flex: 1,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.06em",
                        fontFamily: "Geist, sans-serif",
                      }}
                    >
                      {
                        (() => {
                          const name = getFriendlyModelName(
                        selectedModel,
                        configuredProviders,
                        useAppState.getState().auth.isAuthenticated
                          );
                          if (name) return name;
                          const authModels = getAuthenticatedModels();
                          const validProviders = getUserConfiguredProviders(configuredProviders);
                          if (useAppState.getState().auth.isAuthenticated && authModels.length > 0) {
                            return authModels[0].displayName;
                          }
                          if (validProviders.length > 0 && validProviders[0].models.length > 0) {
                            return validProviders[0].models[0].displayName;
                          }
                          return authModels[0]?.displayName || "";
                        })()
                      }
                    </span>
                    <ChevronDownIcon
                      style={{
                        width: "24px",
                        height: "24px",
                        color: colors.brand.main,
                        transition: "transform 0.2s ease",
                        transform: `rotate(${modelMenuOpen ? 180 : 0}deg)`,
                        marginLeft: "4px",
                      }}
                    />
                  </div>
                </button>
                {showMenu && (
                  <>
                    <div
                      onClick={() => setModelMenuOpen(false)}
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: 0,
                        right: 0,
                        background: colors.app.primary,
                        border: `1px solid ${colors.border.primary}`,
                        borderRadius: "14px",
                        boxShadow: shadows.card,
                        overflow: "hidden",
                        zIndex: 1000,
                        marginBottom: "4px",
                        minWidth: "220px",
                        width: "max-content",
                        opacity: menuAnimating ? 1 : 0,
                        transform: `translateY(${
                          menuAnimating ? 0 : 12
                        }px) scale(${menuAnimating ? 1 : 0.98})`,
                        pointerEvents: menuAnimating ? "auto" : "none",
                        transition:
                          "opacity 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      <ModelDropdown inMenu={true} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <SendButton />
          </div>
        </div>
      </div>
    </div>
  );
});

export { TextInput, SendButton };
export default Bottom;