import { staticConfig } from "renderer/config";
import * as webSocket from "ws";
import { installCert } from "./apps/os/ca";
import { ipcRenderer } from "electron";

let activeSocket: webSocket | null = null;

export const sendMessageToExtension = (message: object): void => {
  if (activeSocket && activeSocket.readyState === webSocket.OPEN) {
    const formattedMessage = JSON.stringify({
      ...message,
      source: "desktop-app",
    });
    activeSocket.send(formattedMessage);
    console.log(`Message sent: ${formattedMessage}`);
  } else {
    console.error(
      "Cannot send message, no active socket or socket is not open"
    );
  }
};

const tryParseJSON = (message: string): Record<string, any> | null => {
  try {
    return JSON.parse(message);
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
};

export const messageHandler = (): void => {
  if (activeSocket) {
    activeSocket.on("message", (messageString: string) => {
      console.log(`Received message: ${messageString}`);

      // Optionally process and send a response
      const message = tryParseJSON(messageString);
      if (message) {
        switch (message.action) {
          case "get_proxy":
            sendMessageToExtension({
              action: message.action,
              proxyPort: window.proxy.httpPort,
            });
            break;
          case "browser-connected":
            installCert(staticConfig.ROOT_CERT_PATH)
              .then(() =>
                ipcRenderer.invoke("browser-connected", {
                  appId: message.appId,
                })
              )
              .catch(() => {
                // none
              });
            break;

          case "browser-disconnected":
            ipcRenderer.invoke("browser-disconnected", {
              appId: message.appId,
            });
            break;
          default:
            console.log("Unknown action:", message.action);
        }
      }
    });
  } else {
    console.error("No active socket to receive messages from");
  }
};

// https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle#chrome_116
// Active WebSocket connections extend extension service worker lifetimes
const sendHeartbeat = () => {
  return setInterval(() => {
    sendMessageToExtension({ action: "heartbeat" });
  }, 27000);
};

export const startHelperSocketServer = (port: number): webSocket.Server => {
  const server = new webSocket.Server({ port });

  server.on("connection", (socket: webSocket) => {
    console.log("New client connected");

    activeSocket = socket;
    messageHandler();
    const heartbeatTimer = sendHeartbeat();

    // Handle client disconnect
    socket.on("close", () => {
      console.log("Client disconnected");
      activeSocket = null; // Clear the socket when client disconnects
      clearInterval(heartbeatTimer);
    });
  });

  return server;
};
