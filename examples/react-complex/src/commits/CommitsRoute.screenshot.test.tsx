import { QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { createAppQueryClient } from '../app/queryClient';
import { createStaticFeatureFlagClient } from '../shared/featureFlags';
import type { StaticFeatureFlagValues } from '../shared/featureFlags';
import type { HttpClient } from '../shared/httpClient';
import {
  createEmptyHttpClient,
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import CommitsRoute from './CommitsRoute';

interface ScreenshotState {
  readonly featureFlagOverrides: StaticFeatureFlagValues;
  readonly httpClient: HttpClient;
  readonly name: string;
}

const states: readonly ScreenshotState[] = [
  {
    featureFlagOverrides: {},
    httpClient: createLoadingHttpClient(),
    name: 'commits-loading',
  },
  {
    featureFlagOverrides: {},
    httpClient: createErrorHttpClient('Commits unavailable'),
    name: 'commits-error',
  },
  {
    featureFlagOverrides: {},
    httpClient: createFakeHttpClient(),
    name: 'commits-success',
  },
  {
    featureFlagOverrides: {
      'commits.showAuthor': false,
    },
    httpClient: createFakeHttpClient(),
    name: 'commits-success-author-hidden',
  },
  {
    featureFlagOverrides: {},
    httpClient: createEmptyHttpClient(),
    name: 'commits-empty',
  },
];

const repositoryConfig = {
  owner: 'temoncher',
  repo: 'dikon',
  fullName: 'temoncher/dikon',
};

const noopRouter = {
  navigate: () => undefined,
};

test.each(states)(
  '$name visual state stays stable',
  async ({ featureFlagOverrides, httpClient, name }) => {
    const shellDi = {
      featureFlagClient: createStaticFeatureFlagClient(featureFlagOverrides),
      httpClient,
      repositoryConfig,
      router: noopRouter,
    };

    await render(
      <QueryClientProvider client={createAppQueryClient()}>
        <CommitsRoute shellDi={shellDi} />
      </QueryClientProvider>,
    );

    await expect(page.getByTestId('route-panel')).toMatchScreenshot(name);
  },
);
