/**
 * Cap'n Web RPC Setup for Background Window
 *
 * This module initializes the Cap'n Web RPC session in the Background Window.
 * It creates the transport and exposes the HelloWorld service for testing.
 *
 * Usage: Import and call initCapnWebRpc() in the background window's entry point.
 */

import { RpcSession } from "capnweb";
import { BackgroundTransport } from "./BackgroundTransport";
import { HelloWorldService } from "./HelloWorldService";

// Re-export types for convenience
export { HelloWorldService, type IHelloWorldService } from "./HelloWorldService";
export { BackgroundTransport } from "./BackgroundTransport";

//@ts-ignore
let session: RpcSession<unknown> | null = null;
let helloWorldService: HelloWorldService | null = null;

/**
 * Initialize the Cap'n Web RPC session in the Background Window.
 * This sets up the transport and exposes the HelloWorld service.
 *
 * @returns The RPC session instance
 */
//@ts-ignore
export function initCapnWebRpc(): RpcSession<unknown> {
  if (session) {
    console.log("[CapnWeb] Session already initialized");
    return session;
  }

  console.log("[CapnWeb] Initializing RPC session in Background Window...");

  // Create the transport (handles communication with Main Process relay)
  const transport = new BackgroundTransport();

  // Create the HelloWorld service that will be exposed to the Web App
  helloWorldService = new HelloWorldService();

  // Create the RPC session with our service as the "main" interface
  // The Web App will be able to call methods on this service
  //@ts-ignore
  session = new RpcSession(transport, helloWorldService);

  console.log("[CapnWeb] RPC session initialized successfully!");
  console.log("[CapnWeb] HelloWorldService is now available to the Web App");

  //@ts-ignore
  return session;
}

/**
 * Get the current RPC session (if initialized)
 */
//@ts-ignore
export function getCapnWebSession(): RpcSession<unknown> | null {
  return session;
}

/**
 * Get the HelloWorld service instance
 */
export function getHelloWorldService(): HelloWorldService | null {
  return helloWorldService;
}

/**
 * Cleanup the Cap'n Web session
 */
export function cleanupCapnWebRpc(): void {
  if (session) {
    console.log("[CapnWeb] Cleaning up RPC session...");
    // RpcSession implements Disposable
    (session as any)[Symbol.dispose]?.();
    session = null;
    helloWorldService = null;
  }
}
