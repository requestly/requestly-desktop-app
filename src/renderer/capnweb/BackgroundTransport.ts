/**
 * Background Transport for Cap'n Web
 * 
 * This implements Cap'n Web's RpcTransport interface for the Background Window.
 * It uses Electron's ipcRenderer to communicate through the Main Process relay.
 * 
 * Messages flow:
 *   Background → ipcRenderer.send("capnweb-to-webapp") → Main → Web App
 *   Web App → Main → ipcRenderer.on("capnweb-from-webapp") → Background
 */

import { ipcRenderer } from "electron";
import type { RpcTransport } from "capnweb";

const CHANNELS = {
  // Messages we send (to Web App via Main)
  SEND: "capnweb-to-webapp",
  // Messages we receive (from Web App via Main)
  RECEIVE: "capnweb-from-webapp",
} as const;

/**
 * RpcTransport implementation for the Background Window.
 * 
 * This transport is used by Cap'n Web to send/receive messages.
 * The Background Window acts as the "server" - it hosts RpcTarget instances
 * that can be called by the Web App.
 */
export class BackgroundTransport implements RpcTransport {
  private messageQueue: string[] = [];
  private waitingReceivers: Array<(msg: string) => void> = [];
  private isAborted = false;
  private abortError: Error | null = null;
  
  constructor() {
    this.setupListener();
    console.log("[BackgroundTransport] Initialized");
  }
  
  private setupListener() {
    ipcRenderer.on(CHANNELS.RECEIVE, (_event, message: string) => {
      console.log("[BackgroundTransport] Received message:", message.substring(0, 100) + "...");
      
      if (this.waitingReceivers.length > 0) {
        // Someone is waiting for a message, give it to them immediately
        const resolve = this.waitingReceivers.shift()!;
        resolve(message);
      } else {
        // No one waiting, queue the message
        this.messageQueue.push(message);
      }
    });
  }
  
  /**
   * Send a message to the Web App (via Main Process relay)
   */
  async send(message: string): Promise<void> {
    if (this.isAborted) {
      throw this.abortError || new Error("Transport has been aborted");
    }
    
    console.log("[BackgroundTransport] Sending message:", message.substring(0, 100) + "...");
    ipcRenderer.send(CHANNELS.SEND, message);
  }
  
  /**
   * Receive the next message from the Web App
   * This will wait until a message arrives if none are queued.
   */
  async receive(): Promise<string> {
    if (this.isAborted) {
      throw this.abortError || new Error("Transport has been aborted");
    }
    
    // Check if we have a queued message
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }
    
    // Wait for the next message
    return new Promise((resolve, reject) => {
      if (this.isAborted) {
        reject(this.abortError || new Error("Transport has been aborted"));
        return;
      }
      
      this.waitingReceivers.push(resolve);
    });
  }
  
  /**
   * Abort the transport - called when the connection should be terminated
   */
  abort(reason?: any): void {
    console.log("[BackgroundTransport] Aborting:", reason);
    this.isAborted = true;
    this.abortError = reason instanceof Error ? reason : new Error(String(reason || "Transport aborted"));
    
    // Clear any waiting receivers (they'll get rejected on next receive() call)
    this.waitingReceivers = [];
    this.messageQueue = [];
    
    // Remove IPC listener
    ipcRenderer.removeAllListeners(CHANNELS.RECEIVE);
  }
}


/**
 * IPC-Backed MessagePort for Background Window
 * 
 * This creates a MessagePort-like interface backed by Electron IPC.
 * Use with newMessagePortRpcSession() to get Cap'n Web's native session
 * without writing a custom RpcTransport.
 * 
 * Usage:
 *   const port = new IpcBackedMessagePort();
 *   const session = newMessagePortRpcSession(port, new HelloWorldService());
 */

export class IpcBackedMessagePort {
  private messageListeners: Array<(event: { data: any }) => void> = [];
  private errorListeners: Array<(event: { data: any }) => void> = [];
  private ipcHandler: (event: Electron.IpcRendererEvent, data: any) => void;
  private started = false;

  constructor() {
    // Create handler but don't attach yet (wait for start())
    this.ipcHandler = (_event, data: string | null) => {
      console.log("[IpcBackedMessagePort] Received:", typeof data === 'string' ? data.substring(0, 80) + '...' : data);
      
      // Create MessageEvent-like object (Cap'n Web only reads .data)
      const messageEvent = { data };
      
      // Notify all message listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(messageEvent);
        } catch (err) {
          console.error("[IpcBackedMessagePort] Listener error:", err);
        }
      });
    };

    console.log("[IpcBackedMessagePort] Created (waiting for start())");
  }

  /**
   * Start receiving messages.
   * Called by Cap'n Web's MessagePortTransport in its constructor.
   */
  start(): void {
    if (this.started) return;
    this.started = true;
    
    ipcRenderer.on(CHANNELS.RECEIVE, this.ipcHandler);
    console.log("[IpcBackedMessagePort] Started listening on", CHANNELS.RECEIVE);
  }

  /**
   * Add event listener.
   * Cap'n Web uses "message" and "messageerror" events.
   */
  addEventListener(type: string, callback: (event: { data: any }) => void): void {
    if (type === "message") {
      this.messageListeners.push(callback);
    } else if (type === "messageerror") {
      this.errorListeners.push(callback);
    }
  }

  /**
   * Send a message to the Web App.
   * Cap'n Web sends strings, or null as a close signal.
   */
  postMessage(message: string | null): void {
    console.log("[IpcBackedMessagePort] Sending:", typeof message === 'string' ? message.substring(0, 80) + '...' : message);
    ipcRenderer.send(CHANNELS.SEND, message);
  }

  /**
   * Close the port and clean up.
   * Called by Cap'n Web's MessagePortTransport in abort().
   */
  close(): void {
    console.log("[IpcBackedMessagePort] Closing");
    ipcRenderer.removeListener(CHANNELS.RECEIVE, this.ipcHandler);
    this.messageListeners = [];
    this.errorListeners = [];
    this.started = false;
  }
}