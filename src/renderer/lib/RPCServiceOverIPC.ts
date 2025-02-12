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

  private generateChannelNameForMethod(method: Function) {
    return `${this.RPC_CHANNEL_PREFIX}${method.name}`;
  }

  // eslint-disable-next-line no-unused-vars
  protected exposeMethodOverIPC(method: (..._args: any[]) => Promise<any>) {
    const channelName = this.generateChannelNameForMethod(method);
    ipcRenderer.on(channelName, async (_event, args) => {
      try {
        const result = await method(args);
        ipcRenderer.send(`reply-${channelName}`, {
          success: true,
          data: result,
        });
      } catch (error: any) {
        ipcRenderer.send(`reply-${channelName}`, {
          success: false,
          data: error.message,
        });
      }
    });
  }

  protected sendServiceEvent(event: any) {
    return ipcRenderer.send("send-from-background-to-webapp", {
      channel: this.LIVE_EVENTS_CHANNEL,
      payload: event,
    });
  }
}
