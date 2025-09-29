import React from "react";
import { useAppState } from "../../state";
import { useTheme } from "../styles/theme";

// ========== CONSTANTS ==========
const STATUS_MESSAGES: Record<string, string> = {
  idle: "Start Task",
  initializing: "Starting task",
  "pulling-dom": "Analyzing page content",
  "performing-query": "Planning next action",
  "performing-action": "Executing action",
};

const TIME_STYLE = { fontFamily: "Geist Mono", letterSpacing: "0.5px" };
const ROW_STYLE = { display: "flex", justifyContent: "space-between", alignItems: "center" };

// ========== HELPER ==========
const formatTime = (ms: number) => `${(ms / 1000).toFixed(3)}s`;

// ========== COMPONENT ==========
const StatusCard = () => {
  const { status, actionStatus, taskTiming } = useAppState((s) => s.taskManager);
  const { colors } = useTheme();
  const [prevAction, setPrevAction] = React.useState(actionStatus);
  const [phaseStart, setPhaseStart] = React.useState(Date.now());
  const [phaseTime, setPhaseTime] = React.useState(0);
  const [totalTime, setTotalTime] = React.useState(0);

  // Track phase changes
  React.useEffect(() => {
    if (actionStatus !== prevAction && status === "running") {
      setPhaseStart(Date.now());
      setPhaseTime(0);
    }
    setPrevAction(actionStatus);
  }, [actionStatus, prevAction, status]);

  // Update phase timer
  React.useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(() => setPhaseTime(Date.now() - phaseStart), 10);
    return () => clearInterval(timer);
  }, [status, phaseStart]);

  // Update total timer
  React.useEffect(() => {
    if (status === "running" && taskTiming.startTime) {
      const timer = setInterval(() => setTotalTime(Date.now() - taskTiming.startTime!), 10);
      return () => clearInterval(timer);
    } else if (taskTiming.elapsedTime > 0) {
      setTotalTime(taskTiming.elapsedTime);
    }
  }, [status, taskTiming.startTime, taskTiming.elapsedTime]);

  // Don't render if no timing data and idle
  if (!taskTiming.startTime && status === "idle") return null;

  const isRunning = status === "running";
  const msg = STATUS_MESSAGES[isRunning ? actionStatus : "idle"] || "Unknown status";

  return (
    <div
      style={{
        backgroundColor: colors.app.primary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 19,
        marginBottom: 19,
        padding: "16px 20px",
        alignSelf: "flex-start",
        maxWidth: "min(665px, 100%)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          fontFamily: "Geist, sans-serif",
          fontSize: 12,
          color: colors.text.secondary,
          width: "100%",
        }}
      >
        <div style={ROW_STYLE}>
          <span>{msg}</span>
          <span style={TIME_STYLE}>{isRunning ? formatTime(phaseTime) : "0.000s"}</span>
        </div>
        <div style={ROW_STYLE}>
          <span>Total Time</span>
          <span style={TIME_STYLE}>
            {isRunning ? formatTime(totalTime) : taskTiming.elapsedTime > 0 ? formatTime(taskTiming.elapsedTime) : "0.000s"}
          </span>
        </div>
        {isRunning && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: colors.brand.main,
              fontFamily: "Geist Mono, monospace",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: colors.brand.main,
                animation: "pulse 2s infinite",
              }}
            />
            LIVE
          </div>
        )}
      </div>
      <style>
        {`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`}
      </style>
    </div>
  );
};

export default StatusCard;
