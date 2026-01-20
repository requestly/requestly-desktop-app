/**
 * HelloWorld RPC Service
 *
 * A simple RpcTarget for testing the Cap'n Web setup.
 * This runs in the Background Window and exposes methods that can be called
 * from the Web App via Cap'n Web RPC.
 */

import { newMessagePortRpcSession, RpcSession, RpcTarget } from "capnweb";

/**
 * Type definition for the HelloWorld service interface.
 * This should be shared with the web app for type safety.
 */
export interface IHelloWorldService {
  /** Simple greeting */
  greet(name: string): string;

  /** Returns current timestamp */
  getTimestamp(): number;

  /** Echo back whatever is sent */
  echo<T>(data: T): T;

  /** Simulates an async operation */
  delayedGreet(name: string, delayMs: number): Promise<string>;

  /** Returns system info from the background process */
  getSystemInfo(): {
    platform: string;
    nodeVersion: string;
    electronVersion: string;
    pid: number;
  };

  /** Add two numbers - simple computation test */
  add(a: number, b: number): number;

  /** Throws an error - for testing error handling */
  throwError(message: string): never;
}

let session;

/**
 * HelloWorld RPC Target implementation.
 * Extends RpcTarget to be passable by reference over Cap'n Web.
 */
export class HelloWorldService extends RpcTarget implements IHelloWorldService {
  moo(port: MessagePort) {
    session = newMessagePortRpcSession<IHelloWorldService>(port, new HelloWorldService());
  }


  greet(name: string): string {
    console.log(`[HelloWorldService] greet called with: ${name}`);
    return `Hello, ${name}! Greetings from the Background Process.`;
  }

  getTimestamp(): number {
    const timestamp = Date.now();
    console.log(`[HelloWorldService] getTimestamp called, returning: ${timestamp}`);
    return timestamp;
  }

  echo<T>(data: T): T {
    console.log(`[HelloWorldService] echo called with:`, data);
    return data;
  }

  async delayedGreet(name: string, delayMs: number): Promise<string> {
    console.log(`[HelloWorldService] delayedGreet called, waiting ${delayMs}ms...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return `Hello, ${name}! (after ${delayMs}ms delay)`;
  }

  getSystemInfo() {
    const info = {
      platform: process.platform,
      nodeVersion: process.version,
      electronVersion: process.versions.electron || "unknown",
      pid: process.pid,
    };
    console.log(`[HelloWorldService] getSystemInfo called, returning:`, info);
    return info;
  }

  add(a: number, b: number): number {
    const result = a + b;
    console.log(`[HelloWorldService] add(${a}, ${b}) = ${result}`);
    return result;
  }

  throwError(message: string): never {
    console.log(`[HelloWorldService] throwError called with: ${message}`);
    throw new Error(message);
  }
}
