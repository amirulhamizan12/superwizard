import React, { useEffect } from "react";
import Interface from "./interface";

const displayBranding = () => {
  const log = console.log.bind(console);
  const banner = `%c
    ███████╗██╗   ██╗██████╗ ███████╗██████╗ ██╗    ██╗██╗███████╗ █████╗ ██████╗ ██████╗      █████╗ ██╗
    ██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██║    ██║██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██║
    ███████╗██║   ██║██████╔╝█████╗  ██████╔╝██║ █╗ ██║██║  ███╔╝ ███████║██████╔╝██║  ██║    ███████║██║
    ╚════██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██║███╗██║██║ ███╔╝  ██╔══██║██╔══██╗██║  ██║    ██╔══██║██║
    ███████║╚██████╔╝██║     ███████╗██║  ██║╚███╔███╔╝██║███████╗██║  ██║██║  ██║██████╔╝    ██║  ██║██║
    ╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝╚═╝`;
    log(banner, "color: #1D7BA7; font-weight: bold;");
    log("%cJoin the team ~ founders@superwizard.ai", "font-size: 20px; font-weight: bold; color: #1D7BA7; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);");
};

const App = () => {
  useEffect(() => displayBranding(), []);
  return <Interface />;
};

export default App;
