import { describe, expect, test } from 'vitest';

import { createWouterRouterService } from './wouterRouterService';

describe('createWouterRouterService', () => {
  test('adapts wouter navigation to the DI router interface', () => {
    const navigatedTo: string[] = [];
    const router = createWouterRouterService((path) => {
      navigatedTo.push(path);
    });

    router.navigate({ id: 'issues' });

    expect(navigatedTo).toEqual(['/issues']);
  });
});
