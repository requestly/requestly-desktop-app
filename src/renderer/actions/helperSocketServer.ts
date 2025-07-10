import { staticConfig } from "renderer/config";
import * as webSocket from "ws";
import { installCert } from "./apps/os/ca";
import { ipcRenderer } from "electron";

const activeSockets = new Map<string, webSocket>();
let helperSocketServer: webSocket.Server;

export const sendMessageToExtension = (
  clientId: string,
  message: object
): void => {
  const activeSocket = activeSockets.get(clientId);

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

export const broadcastToExtensions = (message: object) => {
  activeSockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
};

const tryParseJSON = (message: string): Record<string, any> | null => {
  try {
    return JSON.parse(message);
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
};

export const messageHandler = (clientId: string, socket: webSocket): void => {
  if (socket) {
    socket.on("message", (messageString: string) => {
      console.log(`Received message: ${messageString}`);

      // Optionally process and send a response
      const message = tryParseJSON(messageString);
      if (message) {
        switch (message.action) {
          case "get-proxy":
            sendMessageToExtension(clientId, {
              action: message.action,
              proxyPort: window.proxy.httpPort,
            });
            break;
          case "browser-connected":
            installCert(staticConfig.ROOT_CERT_PATH)
              .then(() =>
                ipcRenderer.invoke("browser-connected", {
                  appId: message.appId,
                  connectedExtensionClientId: clientId,
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
            console.log("Unknown action app:", message.action);
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
    broadcastToExtensions({ action: "heartbeat" });
  }, 20000);
};

export const stopHelperSocketServer = () => {
  if (helperSocketServer) {
    helperSocketServer.close(() => {
      console.log("Helper socket server stopped");
    });
    activeSockets.clear();
  }
}


export const startHelperSocketServer = (port: number): webSocket.Server => {
  if(helperSocketServer) {
    stopHelperSocketServer();
  }
  helperSocketServer = new webSocket.Server({ port });

  helperSocketServer.on("connection", (socket: webSocket, req) => {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    console.log(`Client connected: ${clientId}`);

    socket.send(JSON.stringify({ type: "handshakeResponse" }));

    activeSockets.set(clientId, socket);
    messageHandler(clientId, socket);
    const heartbeatTimer = sendHeartbeat();

    // Handle client disconnect
    socket.on("close", () => {
      console.log("Client disconnected");
      activeSockets.delete(clientId);
      clearInterval(heartbeatTimer);
    });

    // Handle client errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      activeSockets.delete(clientId);
      clearInterval(heartbeatTimer);
    });
  });

  return helperSocketServer;
};