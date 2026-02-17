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
    ipcRenderer.on(channelName, async (_event, incomingData) => {
      // Extract payload and replyChannel (sent by setupIPCForwarding)
      const { payload: args, replyChannel } = incomingData || {};
      const actualArgs = args || incomingData; // Fallback for old format
      const actualReplyChannel = replyChannel || `reply-${channelName}`; // Fallback for old format

      const callId = `${channelName}-${Date.now()}`;
      const startTime = performance.now();
      console.log(`[IPC-HANDLER] Received call: ${callId}`, actualArgs);

      try {
        const result = await method(
          ...(Array.isArray(actualArgs) ? actualArgs : [actualArgs])
        );
        const methodTime = performance.now() - startTime;

        console.log(
          `[IPC-HANDLER] Method completed in ${methodTime.toFixed(
            2
          )}ms, sending reply: ${callId} to ${actualReplyChannel}`
        );
        const sendStart = performance.now();

        ipcRenderer.send(actualReplyChannel, {
          success: true,
          data: result,
        });

        const sendTime = performance.now() - sendStart;
        const totalTime = performance.now() - startTime;
        console.log(
          `[IPC-HANDLER] Reply sent in ${sendTime.toFixed(
            2
          )}ms, total: ${totalTime.toFixed(2)}ms: ${callId}`
        );
      } catch (error: any) {
        const errorTime = performance.now() - startTime;
        console.error(
          `[IPC-HANDLER] Method error after ${errorTime.toFixed(
            2
          )}ms: ${callId}`,
          error
        );

        captureException(error);
        ipcRenderer.send(actualReplyChannel, {
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
