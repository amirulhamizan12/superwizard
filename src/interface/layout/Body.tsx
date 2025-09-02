import React, { RefObject } from "react";
import DeveloperView from "../chat/DeveloperView";
import DirectView from "../chat/DirectView";
import Sidebar from "./Sidebar";
import { useAppState } from "../../state";
import { colors } from "../styles/theme";

const Body: React.FC<{
  chatContainerRef: RefObject<HTMLDivElement | null>;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}> = ({ chatContainerRef, sidebarOpen, onCloseSidebar }) => {
  const { chatViewMode } = useAppState((s) => s.settings);

  return (
    <>
      <style>{`.main-content::-webkit-scrollbar{width:6px}.main-content::-webkit-scrollbar-track{width:6px;background:transparent}.main-content::-webkit-scrollbar-thumb{background:${colors.background.scrollbarThumb};border-radius:24px}.main-content::before{content:"";position:fixed;top:48px;left:0;right:0;height:18px;background:linear-gradient(${colors.background.primary} 5%,transparent);pointer-events:none;z-index:10}`}</style>
      <div
        style={{
          position: "relative",
          height: "calc(100vh - 48px)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <Sidebar isOpen={sidebarOpen} onClose={onCloseSidebar} />
        <div
          className="main-content"
          style={{
            flex: "1",
            overflowY: "auto",
            overflowX: "hidden",
            padding: 0,
            backgroundColor: colors.background.primary,
            height: "100%",
            width: "100%",
          }}
          ref={chatContainerRef}
        >
          <div
            style={{
              width: "100%",
              margin: 0,
              marginTop: 0,
              paddingBottom: "100px",
            }}
          >
            {chatViewMode === "dev" ? <DeveloperView /> : <DirectView />}
          </div>
        </div>
      </div>
    </>
  );
};

export default Body;
