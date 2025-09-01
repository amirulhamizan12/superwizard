import React, { useEffect } from "react";
import Interface from "./interface";

// Branding function that won't be removed in production
const displayBranding = () => {
  /* eslint-disable no-console */
  // Use a custom branding function that won't be removed by TerserPlugin
  const brandLog = console.log.bind(console);

  brandLog(
    "%c\n███████╗██╗   ██╗██████╗ ███████╗██████╗ ██╗    ██╗██╗███████╗ █████╗ ██████╗ ██████╗      █████╗ ██╗\n" +
      "██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██║    ██║██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██║\n" +
      "███████╗██║   ██║██████╔╝█████╗  ██████╔╝██║ █╗ ██║██║  ███╔╝ ███████║██████╔╝██║  ██║    ███████║██║\n" +
      "╚════██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██║███╗██║██║ ███╔╝  ██╔══██║██╔══██╗██║  ██║    ██╔══██║██║\n" +
      "███████║╚██████╔╝██║     ███████╗██║  ██║╚███╔███╔╝██║███████╗██║  ██║██║  ██║██████╔╝    ██║  ██║██║\n" +
      "╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝╚═╝\n",
    "color: #1D7BA7; font-weight: bold;"
  );

  brandLog(
    "%cJoin the team ~ founder@superwizard.ai",
    "font-size: 20px; font-weight: bold; color: #1D7BA7; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);"
  );
  /* eslint-enable no-console */
};

const App = () => {
  // Display ASCII art in console when app loads
  useEffect(() => {
    displayBranding();
  }, []);

  return <Interface />;
};

export default App;
