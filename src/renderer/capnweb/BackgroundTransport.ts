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
