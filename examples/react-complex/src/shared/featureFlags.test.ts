import { describe, expect, test } from 'vitest';

import { dikon } from '../../../../dikon.ts';
import { createFeatureFlagClient, createFeatureFlagsDikon } from './featureFlags';

describe('createFeatureFlagsDikon', () => {
  test('provides typed feature flags from namespaced root flag values and defaults', () => {
    const flagsDikon = createFeatureFlagsDikon({
      namespace: 'commits',
      flags: {
        compactList: false,
        showAuthor: true,
      },
    });
    const di = dikon()
      .require<{ featureFlagClient: ReturnType<typeof createFeatureFlagClient> }>()
      .use(flagsDikon)
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
