import * as Sentry from "@sentry/browser";
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
    return `${this.RPC_CHANNEL_PREFIX}${method.name}`;
  }

  protected exposeMethodOverIPC(
    exposedMethodName: string,
    method: (..._args: any[]) => Promise<any>
  ) {
    const channelName = `${this.RPC_CHANNEL_PREFIX}${exposedMethodName}`;

    ipcRenderer.on(channelName, async (_event, args) => {
      console.log(`[Background RPC] ${channelName} - Raw args:`, args);
      console.log(
        `[Background RPC] ${channelName} - Args is array?`,
        Array.isArray(args)
      );
      console.log(
        `[Background RPC] ${channelName} - Args length:`,
        args?.length
      );

      // Extract trace context from last argument (added by traceIPC.invokeEventInBG)
      const lastArg = args[args.length - 1];
      console.log(`[Background RPC] ${channelName} - Last arg:`, lastArg);

      const hasTraceContext =
        lastArg && typeof lastArg === "object" && lastArg._traceContext;
      const traceContext = hasTraceContext ? lastArg._traceContext : null;
      const cleanArgs = hasTraceContext ? args.slice(0, -1) : args;

      console.log(
        `[Background RPC] ${channelName} - Trace context:`,
        traceContext ? "present" : "missing",
        traceContext
      );

      try {
        let result;

        if (traceContext) {
          console.log(
            `[Background RPC] ${channelName} - Starting traced execution`
          );
          console.log(
            `[Background RPC] sentry-trace:`,
            traceContext["sentry-trace"]
          );
          console.log(`[Background RPC] baggage:`, traceContext.baggage);
          // Continue distributed trace from React
          result = await Sentry.continueTrace(
            {
              sentryTrace: traceContext["sentry-trace"],
              baggage: traceContext.baggage,
            },
            async () => {
              return await Sentry.startSpan(
                {
                  name: channelName,
                  op: "Electron-background.rpc",
                  attributes: {
                    "rpc.method": exposedMethodName,
                  },
                },
                async () => {
                  return await method(...cleanArgs);
                }
              );
            }
          );
        } else {
          // No trace context, execute normally
          result = await method(...cleanArgs);
        }

        ipcRenderer.send(`reply-${channelName}`, {
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error(`[Background RPC] Error in ${channelName}:`, error);

        // Capture exception in Sentry with context
        Sentry.captureException(error, {
          tags: {
            process: "electron-background",
            component: "rpc-handler",
            rpc_method: exposedMethodName,
          },
          contexts: {
            rpc: {
              channel: channelName,
              method: exposedMethodName,
              args: cleanArgs,
            },
          },
        });

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
