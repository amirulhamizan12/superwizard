import { useAppState } from "../../state";

// =============================================================================
// COLOR DEFINITIONS
// =============================================================================

const lightColors = {
  // Brand Colors
  brand: {
    main: "#1D7BA7", // Main brand blue
    hover: "#166086", // Hover state
  },

  // Background Colors
  app: {
    primary: "#FEFCF4", // Main background 
    secondary: "#F8F2DF", // Secondary background
    tertiary: "#FAF5E5", // Tertiary background
    hover: "#F8F2DF", // Hover backgrounds
    model: "#BEE3F8", // Model background
    // Scrollbar Colors
    scrollbarThumb: "#999999", // Scrollbar thumb color    
    // Bottom Colours
    bottombtn: "#FEFEF9", // Bottom backgrounds
    bottombkg: "#FAF5E5", // Input backgrounds
    buttonicn: "#666666", // Button icons
  },

  // Text Colors
  text: {
    primary: "#3B3B3B", // Main text color
    secondary: "#666666", // Secondary text
    tertiary: "#999999", // Lighter text
    muted: "#6B7280", // Muted text
    disabled: "#999999", // Disabled text
    // hard colors
    white: "#FFFFFF", // White text
    black: "#0A0A0A", // Black text
  },

  // Border Colors
  border: {
    primary: "#A6A09B", // Main borders
    light: "#D3CFCD", // Secondary borders
  },

  // State Colors
  state: {
    success: "#10B981", // Success green
    error: "#EF4444", // Error red
  },
};

const darkColors = {
  // Brand Colors
  brand: {
    main: "#1D7BA7", // Main brand blue
    hover: "#166086", // Hover state
  },

  // Background Colors
  app: {
    primary: "#1F1F1F", // Main background 
    secondary: "#272727", // Secondary background
    tertiary: "#2B2B2B", // Tertiary background
    hover: "#272727", // Hover backgrounds
    model: "#BEE3F8", // Model background
    // Scrollbar Colors
    scrollbarThumb: "#464646", // Scrollbar thumb color    
    // Bottom Colours
    bottombtn: "#202020", // Bottom backgrounds
    bottombkg: "#2B2B2B", // Input backgrounds
    buttonicn: "#B0B0B0", // Button icons
  },

  // Text Colors
  text: {
    primary: "#E5E5E5", // Main text color
    secondary: "#B0B0B0", // Secondary text
    tertiary: "#808080", // Lighter text
    muted: "#9CA3AF", // Muted text
    disabled: "#666666", // Disabled text
    // hard colors
    white: "#FFFFFF", // White text
    black: "#0A0A0A", // Black text
  },

  // Border Colors
  border: {
    primary: "#404040", // Main borders
    light: "#333333", // Secondary borders
  },

  // State Colors
  state: {
    success: "#10B981", // Success green
    error: "#EF4444", // Error red
  },
};

// =============================================================================
// SHADOW DEFINITIONS
// =============================================================================

const lightShadows = {
  md: "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px 0 rgba(0,0,0,0.06)",
  xl: "0 25px 50px -12px rgba(0,0,0,0.25)",
  card: "0 8px 24px -6px rgba(0,0,0,0.12)",
  bottom: "0 -4px 12px -2px rgba(0,0,0,0.1), -4px 0 12px -2px rgba(0,0,0,0.05), 4px 0 12px -2px rgba(0,0,0,0.05)",
};

const darkShadows = {
  md: "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px 0 rgba(0,0,0,0.06)",
  xl: "0 25px 50px -12px rgba(0,0,0,0.25)",
  card: "0 8px 24px -6px rgba(0,0,0,0.12)",
  bottom: "0 -4px 12px -2px rgba(151, 151, 151, 0.1), -4px 0 12px -2px rgba(0,0,0,0.05), 4px 0 12px -2px rgba(0,0,0,0.05)",
};

// =============================================================================
// THEME HOOK
// =============================================================================

// Hook to get the current theme based on dark mode setting
export const useTheme = () => {
  const darkMode = useAppState((state) => state.settings.darkMode);
  
  return {
    colors: darkMode ? darkColors : lightColors,
    shadows: darkMode ? darkShadows : lightShadows,
    isDark: darkMode,
  };
};

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// @deprecated Use useTheme() hook instead for automatic dark mode support
export const colors = lightColors;

// @deprecated Use useTheme() hook instead for automatic dark mode support
export const shadows = lightShadows;

// @deprecated Use useTheme() hook instead for automatic dark mode support
export default {
  colors: lightColors,
  shadows: lightShadows,
};
