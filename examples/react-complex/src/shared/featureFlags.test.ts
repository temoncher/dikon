import { describe, expect, test } from 'vitest';

import { dikon } from '../../../../dikon.ts';
import { createFeatureFlagClient, createFeatureFlagsPlugin } from './featureFlags';

describe('createFeatureFlagsPlugin', () => {
  test('provides typed feature flags from namespaced root flag values and defaults', () => {
    const withFlags = createFeatureFlagsPlugin({
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
