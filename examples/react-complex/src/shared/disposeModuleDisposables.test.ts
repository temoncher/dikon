import { describe, expect, test } from 'vitest';

import { dikon } from '../../../../dikon.ts';
import { dispose } from './disposable';
import { disposeModuleDisposables } from './disposeModuleDisposables';

describe('disposeModuleDisposables', () => {
  test('schedules disposals after the current cleanup turn', async () => {
    let disposeCalls = 0;
    const di = dikon()
      .provide({
        service() {
          return {
            [dispose]() {
              disposeCalls += 1;
            },
          };
        },
      })
      .build();

    const service = di.service;
    expect(service[dispose]).toBeTypeOf('function');
    const disposal = disposeModuleDisposables(di);

    expect(disposeCalls).toBe(0);

    await disposal;

    expect(disposeCalls).toBe(1);
  });
});
