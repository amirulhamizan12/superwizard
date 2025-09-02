// Fonts loader with reduced file size
if (typeof window !== "undefined" && !document.getElementById("custom-fonts")) {
  const style = document.createElement("style");
  style.id = "custom-fonts";
  style.textContent = [
    // Geist and Geist Mono from Google Fonts
    `@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');`,
    `@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap');`,
    // Roca One local font
    `@font-face{font-family:'Roca One';src:url('/assets/fonts/RocaOne-Rg.woff2') format('woff2');font-weight:normal;font-style:normal;font-display:swap;}`,
  ].join("");
  document.head.appendChild(style);
}
