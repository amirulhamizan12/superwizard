import React from "react";

/**
 * Centralized theme configuration for the application
 * This is the single source of truth for all colors and styling
 * Future: Can be extended to support dark mode and other themes
 */

// TypeScript interfaces for better type safety
interface ColorPalette {
  main: string;
  light: string;
  hover: string;
  alpha: string;
}

interface TextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  muted: string;
  placeholder: string;
  disabled: string;
  light: string;
  dark: string;
  accent: string;
}

interface BackgroundColors {
  primary: string;
  secondary: string;
  tertiary: string;
  card: string;
  hover: string;
  disabled: string;
  overlay: string;
  gradient: string;
  input: string;
  scrollbarThumb: string;
}

interface BorderColors {
  primary: string;
  secondary: string;
  light: string;
  focus: string;
  dark: string;
}

interface StateColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface StateBackgroundColors {
  success: string;
  warning: string;
  error: string;
  info: string;
  blue: string;
}

interface ShadowColors {
  light: string;
  medium: string;
  heavy: string;
  card: string;
  input: string;
  overlay: string;
  modalOverlay: string;
  cardHeavy: string;
}

interface Shadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  card: string;
  cardLarge: string;
  menuBottom: string;
  dropdown: string;
  bottom: string;
  focus: string;
}

interface Theme {
  colors: {
    primary: ColorPalette;
    text: TextColors;
    background: BackgroundColors;
    border: BorderColors;
    state: StateColors;
    stateBackground: StateBackgroundColors;
    shadows: ShadowColors;
  };
  shadows: Shadows;
}

export const colors = {
  // Primary Brand Colors
  primary: {
    main: "#1D7BA7", // Main brand blue
    light: "#2B8CB8", // Lighter shade
    hover: "#166086", // Hover state
    alpha: "rgba(29,123,167,0.18)", // Transparent version
  },

  // Text Colors
  text: {
    primary: "#1A202C", // Main text color
    secondary: "#64748B", // Secondary text
    tertiary: "#94A3B8", // Lighter text
    muted: "#6B7280", // Muted text
    placeholder: "#718096", // Input placeholder
    disabled: "#999", // Disabled text
    light: "#666", // Light text
    dark: "#4f4f4f", // Dark text variant
    accent: "#2f2f2f", // Accent text
  },

  // Background Colors
  background: {
    primary: "#FAFAFA", // Main background
    secondary: "#F8FAFC", // Secondary background
    tertiary: "#fafafa", // Tertiary background
    card: "#FFFFFF", // Card backgrounds
    hover: "#f6f6f6", // Hover backgrounds
    disabled: "#f7fafc", // Disabled backgrounds
    overlay: "rgba(0,0,0,0.6)", // Modal overlays
    gradient: "#dedede", // Gradient backgrounds
    input: "#ebebeb", // Input backgrounds
    scrollbarThumb: "#888", // Scrollbar thumb color
  },

  // Border Colors
  border: {
    primary: "#E2E8F0", // Main borders
    secondary: "#e5e7eb", // Secondary borders
    light: "#F1F5F9", // Light borders
    focus: "#1D7BA7", // Focus state borders
    dark: "#222", // Dark borders
  },

  // State Colors
  state: {
    success: "#10B981", // Success green
    warning: "#F59E0B", // Warning yellow
    error: "#EF4444", // Error red
    info: "#8B5CF6", // Info purple
  },

  // State Background Colors
  stateBackground: {
    success: "#F0FDF4", // Success background
    warning: "#FEF3C7", // Warning background (if needed)
    error: "#FEF2F2", // Error background
    info: "#EFF6FF", // Info background
    blue: "#BEE3F8", // Blue background
  },

  // Shadow Colors
  shadows: {
    light: "rgba(0,0,0,0.05)",
    medium: "rgba(0,0,0,0.1)",
    heavy: "rgba(0,0,0,0.25)",
    card: "rgba(0,0,0,0.12)",
    input: "rgba(0,0,0,0.06)",
    overlay: "rgba(0,0,0,0.48)",
    modalOverlay: "rgba(0,0,0,0.48)", // Modal backdrop
    cardHeavy: "rgba(0,0,0,0.18)", // Heavy card shadow
  },
};

/**
 * Common shadow definitions
 */
export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  md: "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px 0 rgba(0,0,0,0.06)",
  lg: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  xl: "0 25px 50px -12px rgba(0,0,0,0.25)",
  card: "0 8px 24px -6px rgba(0,0,0,0.12)",
  cardLarge: "0 8px 32px rgba(0,0,0,0.18)",
  menuBottom: "0 -8px 32px rgba(0,0,0,0.12)",
  dropdown: "0 2px 4px rgba(0,0,0,0.1)",
  bottom:
    "0 -4px 12px -2px rgba(0,0,0,0.1), -4px 0 12px -2px rgba(0,0,0,0.05), 4px 0 12px -2px rgba(0,0,0,0.05)",
  focus: "0 4px 16px 0 rgba(29,123,167,0.18), 0 1.5px 6px 0 rgba(0,0,0,0.10)",
};

/**
 * Theme object that can be extended for different themes (light/dark)
 */
const theme: Theme = {
  colors,
  shadows,
};

// React hook for using theme
export const useTheme = (): Theme => {
  return React.useMemo(() => theme, []);
};

// React component for theme provider (if needed)
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

export default theme;
