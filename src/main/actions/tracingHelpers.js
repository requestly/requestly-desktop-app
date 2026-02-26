const Sentry = require("@sentry/electron/main");

export const withTracing = (operationName, handler) => {
  return async (event, payload) => {
    // Extract trace
    const { _traceContext, ...actualPayload } = payload;

    if (!_traceContext || !_traceContext["sentry-trace"]) {
      console.log(
        `[Tracing] No trace context found for ${operationName}, running without trace`
      );
      return handler(event, actualPayload);
    }

    console.log(`[Tracing] Continuing trace for ${operationName}`);
    console.log(`[Tracing] sentry-trace: ${_traceContext["sentry-trace"]}`);

    return await Sentry.continueTrace(
      {
        sentryTrace: _traceContext["sentry-trace"],
        baggage: _traceContext.baggage,
      },
      async () => {
        return await Sentry.startSpan(
          {
            name: operationName,
            op: "Electron-ipc.main.handle",
            attributes: {
              "ipc.event": operationName,
            },
          },
          async () => {
            try {
              return await handler(event, actualPayload);
            } catch (error) {
              Sentry.captureException(error, {
                tags: {
                  operation: operationName,
                  process: "main",
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
