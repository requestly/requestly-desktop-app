/**
 * Check if you're in a render window
 * @returns {boolean}
 */
export const isThisRenderer = () => {
  // running in a web browser
  if (typeof process === "undefined") return true;
  // node-integration is disabled
  if (!process) return true;
  // We're in node.js somehow
  if (!process.type) return false;

  return process.type === "renderer";
};

/**
 * Check if you're in a Electron window - Any process
 * @returns {boolean}
 */
export const isThisElectron = () => {
  // Renderer process
  if (
    typeof window !== "undefined" &&
    typeof window.process === "object" &&
    window.process.type === "renderer"
  ) {
    return true;
  }
  // Main process
  if (
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    !!process.versions.electron
  ) {
    return true;
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (
    typeof navigator === "object" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.indexOf("Electron") >= 0
  ) {
    return true;
  }

  return false;
};
