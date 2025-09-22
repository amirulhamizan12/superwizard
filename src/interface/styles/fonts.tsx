// Load fonts if not already loaded
if (typeof window !== "undefined" && !document.getElementById("custom-fonts")) {
  const style = document.createElement("style");
  style.id = "custom-fonts";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap');
    @font-face{font-family:'Roca One';src:url('/assets/fonts/RocaOne-Rg.woff2') format('woff2');font-weight:normal;font-style:normal;font-display:swap;}
  `;
  document.head.appendChild(style);
}

// Font family tokens
export const fonts = {
  body: "Geist, sans-serif",
  mono: "'Geist Mono', monospace",
  display: "'Roca One', serif",
};
