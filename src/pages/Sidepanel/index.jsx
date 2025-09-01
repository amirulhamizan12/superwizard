import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "../../App";
import { useAppState } from "../../state";

const Sidepanel = () => {
  // Ensure any running task is stopped when the side panel closes/unmounts
  useEffect(() => {
    const interruptIfRunning = () => {
      try {
        const { status, actions } = useAppState.getState().taskManager;
        if (status === "running") actions.interrupt();
      } catch {}
    };

    const handleBeforeUnload = () => interruptIfRunning();
    const handlePageHide = () => interruptIfRunning();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") interruptIfRunning();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      interruptIfRunning();
    };
  }, []);

  return (
    <div className="sidepanel-container">
      <main className="main-content">
        <App />
      </main>
    </div>
  );
};

const container = window.document.querySelector("#app-container");
if (!container) {
  throw new Error("#app-container element not found");
}

const root = createRoot(container);
root.render(<Sidepanel />);

if (module.hot) module.hot.accept();
