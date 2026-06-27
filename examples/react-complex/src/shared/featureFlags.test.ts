import { describe, expect, test } from 'vitest';

import { dikon } from '../../../../dikon.ts';
import { createFeatureFlagsDiModule, createStaticFeatureFlagClient } from './featureFlags';

describe('createFeatureFlagsDiModule', () => {
  test('provides typed feature flags from namespaced root flag values and defaults', () => {
    const flagsDiModule = createFeatureFlagsDiModule({
      namespace: 'commits',
      flags: {
        compactList: false,
        showAuthor: true,
      },
    });
    const di = dikon()
      .require<{ featureFlagClient: ReturnType<typeof createStaticFeatureFlagClient> }>()
      .use(flagsDiModule)
      .build({
        featureFlagClient: createStaticFeatureFlagClient({
          'commits.compactList': true,
        }),
      });

    expect(di.featureFlags).toEqual({
      compactList: true,
      showAuthor: true,
    });
  });
});
