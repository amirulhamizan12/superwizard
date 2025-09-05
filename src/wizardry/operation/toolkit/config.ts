/**
 * config.ts
 *
 * Configuration settings for DOM operations
 */

export const CONFIG = {
  POSITIONING: {
    // Scroll-related settings
    ELEMENT_TIMEOUT: 100, // Timeout for scroll element operations
    scrolling_wait: 300, // Wait time after scroll operations
    coordinate_Wait: 300, // Wait time for scroll stability before coordinate calculation
  },
  CLICK: {
    WAIT_AFTER_SCROLL_ACCURACY: 1000,
    WAIT_AFTER_CLICK: 50,
  },
  NAVIGATION: {
    WAIT_AFTER_COMPLETE: 300,
  },
  STABILITY: {
    MAX_WAIT_TIME: 20000, // Maximum time to wait for page to load
    ADDITIONAL_BUFFER: 1000, // Additional wait time after page is stable
    POLL_INTERVAL: 100, // Interval for checking DOM readiness
    FALLBACK_TIMEOUT: 3000, // Simple timeout used only when advanced checks fail
    DOM_STABILITY_TIMEOUT: 3000, // Timeout for DOM stability polling
  },
};
