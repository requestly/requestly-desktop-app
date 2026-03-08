interface TraceContext {
  "sentry-trace": string;
  baggage?: string;
}

interface TracedHandlerConfig {
  operationName: string;
  op: string;
  processName: string;
  Sentry: any;
}

export function createTracedHandler(config: TracedHandlerConfig) {
  const { operationName, op, processName, Sentry } = config;

  return (handler: (event: any, payload: any) => Promise<any>) => {
    return async (event: any, payload: any) => {
      const { _traceContext, ...actualPayload } = payload || {};

      if (!_traceContext || !_traceContext["sentry-trace"]) {
        return handler(event, actualPayload);
      }

      return await Sentry.continueTrace(
        {
          sentryTrace: _traceContext["sentry-trace"],
          baggage: _traceContext.baggage,
        },
        async () => {
          return await Sentry.startSpan(
            {
              name: operationName,
              op: op,
              attributes: {
                "ipc.event": operationName,
                "ipc.process": processName,
              },
            },
            async () => {
              try {
                return await handler(event, actualPayload);
              } catch (error) {
                Sentry.captureException(error, {
                  tags: {
                    operation: operationName,
                    process: processName,
                    component: "ipc-handler",
                    traced: true,
                  },
                });
                throw error;
              }
            }
          );
        }
      );
    };
  };
}
