import { describe, expect, test, vi } from 'vitest';

import { createWouterRouterService } from './wouterRouterService';

describe('createWouterRouterService', () => {
  test('adapts wouter navigation to the DI router interface', () => {
    const navigate = vi.fn<() => void>();
    const router = createWouterRouterService(navigate);

    router.navigate({ id: 'issues' });

    expect(navigate).toHaveBeenCalledWith('/issues');
  });
});
