const { ipcRenderer } = require("electron");

const IPC = {};

/**
 * Send a message/payload as an event
 * @param {Object} params
 * @param {string} params.eventName Name of the event to register
 * @param {string} params.payload The message we want to send
 */
IPC.sendEventPayload = (eventName, eventPayload) =>
  ipcRenderer.send(eventName, eventPayload);

/**
 * Invoke an event in the main process. Returns response
 * @param {Object} params
 * @param {string} params.eventName Name of the event to register
 * @param {string} params.payload The message we want to send
 */
IPC.invokeEventInMain = (eventName, eventPayload) =>
  ipcRenderer.invoke(eventName, eventPayload);

/**
 * Invoke an event in the background process abstracted through main. Returns response
 * @param {Object} params
 * @param {Object} params.ipcRenderer Only ipcRender is supported
 * @param {string} params.eventName Name of the event to register
 * @param {string} params.payload The message we want to send
 */
IPC.invokeEventInBG = (eventName, eventPayload) =>
  ipcRenderer.invoke(
    "forward-event-from-webapp-to-background-and-await-reply",
    {
      actualPayload: eventPayload,
      eventName,
    }
  );

/**
 * Register an event using IPC
 * @param {Object} params
 * @param {string} params.eventName Name of the event to register
 * @param {Function} params.eventHandler The event handler function
 */
IPC.registerEvent = (eventName, eventHandler) =>
  ipcRenderer.on(eventName, (event, payload) => eventHandler(payload));

/**
 * Unregister all listeners for an event using IPC
 * @param {Object} params
 * @param {string} params.eventName Name of the event to register
 */
IPC.unregisterEvent = (eventName) =>
  ipcRenderer.removeAllListeners([eventName]);

module.exports = IPC;
