interface TraceContext {
  "sentry-trace": string;
  baggage?: string;
}

interface ExecuteWithTracingConfig {
  traceContext: TraceContext | null;
  spanName: string;
  op: string;
  attributes?: Record<string, any>;
  Sentry: any;
}

export function extractTraceContextFromArgs(args: any[]): {
  traceContext: TraceContext | null;
  cleanArgs: any[];
} {
  if (!Array.isArray(args) || args.length === 0) {
    return { traceContext: null, cleanArgs: args };
  }

  const lastArg = args[args.length - 1];

  // Check if last argument contains trace context
  if (lastArg && typeof lastArg === "object" && lastArg._traceContext) {
    return {
      traceContext: lastArg._traceContext,
      cleanArgs: args.slice(0, -1),
    };
  }

  return { traceContext: null, cleanArgs: args };
}

export async function executeWithTracing<T>(
  config: ExecuteWithTracingConfig,
  fn: () => Promise<T>
): Promise<T> {
  const { traceContext, spanName, op, attributes = {}, Sentry } = config;

  // If no trace context, execute normally
  if (!traceContext || !traceContext["sentry-trace"]) {
    return fn();
  }

  return await Sentry.continueTrace(
    {
      sentryTrace: traceContext["sentry-trace"],
      baggage: traceContext.baggage,
    },
    async () => {
      return await Sentry.startSpan(
        {
          name: spanName,
          op: op,
          attributes,
        },
        async () => {
          try {
            return await fn();
          } catch (error) {
            Sentry.captureException(error, {
              tags: {
                operation: spanName,
                traced: true,
                ...attributes,
              },
            });
            throw error;
          }
        }
      );
    }
  );
}
