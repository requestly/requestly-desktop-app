import { captureException } from "@sentry/browser";
import { ipcRenderer } from "electron";

/**
 * Used to create a RPC like service in the Background process.
 * Has a corresponding Adapter class in the webapp repository.
 * --------------------------------
 * - Expects each RPC method to be exposed individually using `exposeMethodOverIPC`.
 * - Requires Arguments and Responses of those methods to be serializable. (limitation imposed by electron IPC)
 * - Currently only allows one generic fire-and-forget event channel for the service to send events to the webapp -> relayed over "send-from-background-to-webapp" channel.
 */
export class RPCServiceOverIPC {
  private RPC_CHANNEL_PREFIX: string;

  private LIVE_EVENTS_CHANNEL: string;

  constructor(serviceName: string) {
    this.RPC_CHANNEL_PREFIX = `${serviceName}-`;
    this.LIVE_EVENTS_CHANNEL = `SERVICE-${serviceName}-LIVE-EVENTS`;
  }

  generateChannelNameForMethod(method: Function) {
    console.log("DBG-1: method name", method.name);
    return `${this.RPC_CHANNEL_PREFIX}${method.name}`;
  }

  protected exposeMethodOverIPC(
    exposedMethodName: string,
    method: (..._args: any[]) => Promise<any>
  ) {
    const channelName = `${this.RPC_CHANNEL_PREFIX}${exposedMethodName}`;
    // console.log("DBG-1: exposing channel", channelName, Date.now());
    ipcRenderer.on(channelName, async (_event, args) => {
      // console.log(
      //   "DBG-1: received event on channel",
      //   channelName,
      //   _event,
      //   args,
      //   Date.now()
      // );
      try {
        const result = await method(...args);

        // console.log(
        //   "DBG-2: result in method",
        //   result,
        //   channelName,
        //   _event,
        //   args,
        //   exposedMethodName,
        //   Date.now()
        // );
        ipcRenderer.send(`reply-${channelName}`, {
          success: true,
          data: result,
        });
      } catch (error: any) {
        // console.log(
        //   `DBG-2: reply-${channelName} error in method`,
        //   error,
        //   Date.now()
        // );
        captureException(error);
        ipcRenderer.send(`reply-${channelName}`, {
          success: false,
          data: error.message,
        });
      }
    });
  }

  sendServiceEvent(event: any) {
    return ipcRenderer.send("send-from-background-to-webapp", {
      channel: this.LIVE_EVENTS_CHANNEL,
      payload: event,
    });
  }
}
