import * as webSocket from "ws";

let activeSocket: webSocket | null = null;

const extensionId = "mcidagfcffoaenpopilcmlklfmemlpce";

export const sendMessageToExtension = (message: object): void => {
  if (activeSocket && activeSocket.readyState === webSocket.OPEN) {
    const formattedMessage = JSON.stringify({
      ...message,
      source: "desktop-app",
      id: extensionId,
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
    activeSocket.on("message", (message: string) => {
      console.log(`Received message: ${message}`);

      // Optionally process and send a response
      const parsedMessage = tryParseJSON(message);
      if (parsedMessage) {
        switch (parsedMessage.action) {
          case "get_proxy":
            sendMessageToExtension({
              action: parsedMessage.action,
              proxyPort: window.proxy.httpPort,
            });
            break;
          default:
            console.log("Unknown action:", parsedMessage.action);
        }
      }
    });
  } else {
    console.error("No active socket to receive messages from");
  }
};

export const startExtensionSocketConnection = (
  port: number
): webSocket.Server => {
  const server = new webSocket.Server({ port });
  console.log(`WebSocket server started on port ${port}`);

  server.on("connection", (socket: webSocket) => {
    console.log("New client connected");

    activeSocket = socket;
    messageHandler();

    // Handle client disconnect
    socket.on("close", () => {
      console.log("Client disconnected");
      activeSocket = null; // Clear the socket when client disconnects
    });
  });

  return server;
};
