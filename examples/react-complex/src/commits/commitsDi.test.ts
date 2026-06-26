import { describe, expect, test } from 'vitest';

import { rootDikon } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
import type { CommitSummary } from '../shared/githubTypes';
import { createFakeHttpClient } from '../test/fakeHttpClient';
import { commitsDikon } from './commitsDi';

describe('commitsDikon', () => {
  // A parent root container with test doubles. The overrides below replace services that sit
  // above this transport, so the fake HTTP client is never actually called.
  const rootDi = rootDikon.build({
    appConfig: { owner: 'temoncher', repo: 'dikon' },
    featureFlagClient: createFeatureFlagClient(),
    httpClient: createFakeHttpClient(),
    router: { navigate: () => undefined },
  });

  test('override swaps the data loader without reconstructing the HTTP layer', async () => {
    // `override` replaces an existing service while keeping its public type, so a test can stub
    // the network-backed loader directly instead of teaching a fake HTTP client to return the
    // exact GitHub JSON shape this route happens to request.
    const stubbed: readonly CommitSummary[] = [
      {
        sha: 'abc1234',
        message: 'Stubbed commit',
        authorName: 'Tester',
        htmlUrl: 'https://example.test',
      },
    ];
    const di = commitsDikon
      .override({ loadCommits: () => () => Promise.resolve(stubbed) })
      .build(undefined, rootDi);

    // routeMetadata and featureFlags still come from the real definition.
    expect(di.routeMetadata.title).toBe('Recent commits');
    await expect(di.loadCommits()).resolves.toEqual(stubbed);
  });

  test('override can force resolved feature flags contributed through use', () => {
    // featureFlags is contributed by a separate dikon via `.use`, yet override still replaces it
    // by key — handy for pinning a UI state without configuring the flag client's namespaced keys.
    const di = commitsDikon
      .override({ featureFlags: () => ({ compactList: true, showAuthor: false }) })
      .build(undefined, rootDi);

    expect(di.featureFlags).toEqual({ compactList: true, showAuthor: false });
  });

  test('override never leaks into the shared dikon', () => {
    // Branching with override returns a new dikon; the exported one is immutable, so this stray
    // override cannot affect the build below.
    commitsDikon.override({ featureFlags: () => ({ compactList: true, showAuthor: true }) });

    const di = commitsDikon.build(undefined, rootDi);

    expect(di.featureFlags).toEqual({ compactList: false, showAuthor: true });
  });
});
