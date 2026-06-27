export interface RequestContext {
  readonly id: string;
  readonly operation: string;
  readonly startedAt: number;
}

export type CreateRequestContext = (operation: string) => RequestContext;

export type RequestEvent =
  | { readonly type: 'started'; readonly context: RequestContext }
  | { readonly type: 'finished'; readonly context: RequestContext }
  | { readonly type: 'failed'; readonly context: RequestContext; readonly error: unknown };

export interface RequestLog {
  readonly events: readonly RequestEvent[];
  record(event: RequestEvent): void;
}

export interface RequestLogConfig {
  readonly limit?: number;
}

export interface RequestObserver {
  requestStarted?(context: RequestContext): void;
  requestFinished?(context: RequestContext): void;
  requestFailed?(context: RequestContext, error: unknown): void;
}

interface RequestLogDeps {
  readonly requestLog: RequestLog;
}

const DEFAULT_REQUEST_LOG_LIMIT = 100;

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function createRequestContextFactory(): CreateRequestContext {
  return (operation) => ({
    id: createRequestId(),
    operation,
    startedAt: Date.now(),
  });
}

export function createRequestLog(config: RequestLogConfig = {}): RequestLog {
  const events: RequestEvent[] = [];
  const limit = config.limit ?? DEFAULT_REQUEST_LOG_LIMIT;

  return {
    get events() {
      return events;
    },
    record(event) {
      events.push(event);

      if (events.length > limit) {
        events.splice(0, events.length - limit);
      }
    },
  };
}

export function createRequestObservers({ requestLog }: RequestLogDeps) {
  return [
    {
      requestStarted(context) {
        requestLog.record({ type: 'started', context });
      },
      requestFinished(context) {
        requestLog.record({ type: 'finished', context });
      },
      requestFailed(context, error) {
        requestLog.record({ type: 'failed', context, error });
      },
    },
  ] as const satisfies readonly RequestObserver[];
}
