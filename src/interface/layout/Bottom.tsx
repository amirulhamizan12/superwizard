import React, { useState, useImperativeHandle, useRef, useEffect } from "react";
import ResizeTextarea from "react-textarea-autosize";
import { useAppState } from "../../state";
import { getFriendlyModelName } from "../../wizardry/ai/endpoint/userConfig";
import { SettingsIcon, ChevronDownIcon, CloseIcon } from "../styles/Icons";
import ModelDropdown from "../components/ModelDropdown";
import { colors, shadows } from "../styles/theme";

// Shared styles
const btn = {
  border: "none",
  background: colors.background.gradient,
  color: colors.text.dark,
  borderRadius: "24px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const txt = {
  fontFamily: "Geist, sans-serif",
  letterSpacing: "0.06em",
};

// Style injection
if (
  typeof window !== "undefined" &&
  !document.getElementById("custom-placeholder-color")
) {
  const s = document.createElement("style");
  s.id = "custom-placeholder-color";
  s.textContent = `.superwizard-input::placeholder{color:${colors.text.placeholder}!important;font-weight:500!important}.superwizard-input::-webkit-scrollbar{display:none}`;
  document.head.appendChild(s);
}

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
        color: disabled ? colors.text.disabled : colors.text.light,
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

  const running = status === "running";
  const canSend = !running && instructions?.trim();

  const handleClick = async () => {
    if (running) {
      await interrupt();
      onStop?.();
    } else if (canSend) {
      runTask();
      setInstructions("");
      onSend?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        ...btn,
        width: "70px",
        height: "36px",
        borderRadius: "12px",
        fontWeight: "600",
        fontSize: "14px",
        opacity: canSend || running ? 1 : 0.5,
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
            color: canSend ? colors.text.light : colors.text.disabled,
            WebkitTextStroke: `0.1px ${
              canSend ? colors.text.light : colors.text.disabled
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
  } = useAppState((s) => ({
    instructions: s.settings.instructions,
    setInstructions: s.settings.actions.setInstructions,
    selectedModel: s.settings.selectedModel,
    configuredProviders: s.settings.configuredProviders,
    taskStatus: s.taskManager.status,
  }));

  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [menuAnimating, setMenuAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
          background: colors.background.input,
          padding: "10px",
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
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              background: colors.background.input,
            }}
          >
            <TextInput
              ref={inputRef}
              autoFocus
              placeholder="Chat with Superwizard"
              value={instructions || ""}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (instructions?.trim() && taskStatus !== "running") {
                    const { runTask } =
                      useAppState.getState().taskManager.actions;
                    runTask();
                    setInstructions("");
                  }
                }
              }}
              maxRows={15}
            />
          </div>
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
                style={{
                  ...btn,
                  width: "36px",
                  height: "36px",
                  minWidth: "36px",
                }}
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
                    color: colors.primary.main,
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
                        color: colors.primary.main,
                        flex: 1,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.06em",
                        fontFamily: "Geist, sans-serif",
                      }}
                    >
                      {getFriendlyModelName(
                        selectedModel,
                        configuredProviders,
                        useAppState.getState().auth.isAuthenticated
                      ) || "Select Model"}
                    </span>
                    <ChevronDownIcon
                      style={{
                        width: "24px",
                        height: "24px",
                        color: colors.primary.main,
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
                        background: colors.background.primary,
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
