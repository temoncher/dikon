import { describe, expect, test } from 'vitest';

import { createRequestLog, type RequestEvent } from './requestTracking';

function createEvent(type: RequestEvent['type'], operation: string): RequestEvent {
  const context = {
    id: operation,
    operation,
    startedAt: 1,
  };

  if (type === 'failed') {
    return { type, context, error: new Error(operation) };
  }

  return { type, context };
}

describe('createRequestLog', () => {
  test('keeps a sliding event window', () => {
    const requestLog = createRequestLog({ limit: 2 });

    requestLog.record(createEvent('started', 'first'));
    requestLog.record(createEvent('finished', 'second'));
    requestLog.record(createEvent('failed', 'third'));

    expect(requestLog.events.map((event) => event.context.operation)).toEqual(['second', 'third']);

    requestLog.record(createEvent('started', 'fourth'));

    expect(requestLog.events.map((event) => event.context.operation)).toEqual(['third', 'fourth']);
  });
});
