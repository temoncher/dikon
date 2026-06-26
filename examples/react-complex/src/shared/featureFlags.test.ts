import { describe, expect, test } from 'vitest';

import { dikon } from '../../../../dikon.ts';
import { createFeatureFlagClient, createFeatureFlagsPipe } from './featureFlags';

describe('createFeatureFlagsPipe', () => {
  test('provides typed feature flags from namespaced root flag values and defaults', () => {
    const withFlags = createFeatureFlagsPipe({
      namespace: 'commits',
      flags: {
        compactList: false,
        showAuthor: true,
      },
    });
    const di = dikon()
      .require<{ featureFlagClient: ReturnType<typeof createFeatureFlagClient> }>()
      .pipe(withFlags)
      .build({
        featureFlagClient: createFeatureFlagClient({
          'commits.compactList': true,
        }),
      });

    expect(di.featureFlags).toEqual({
      compactList: true,
      showAuthor: true,
    });
  });
});
