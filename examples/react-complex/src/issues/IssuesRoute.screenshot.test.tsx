import { QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { createAppQueryClient } from '../app/queryClient';
import { createStaticFeatureFlagClient } from '../shared/featureFlags';
import {
  createEmptyHttpClient,
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import IssuesRoute from './IssuesRoute';

const states = [
  {
    httpClient: createLoadingHttpClient(),
    name: 'issues-loading',
  },
  {
    httpClient: createErrorHttpClient('Issues unavailable'),
    name: 'issues-error',
  },
  {
    httpClient: createFakeHttpClient(),
    name: 'issues-success',
  },
  {
    httpClient: createEmptyHttpClient(),
    name: 'issues-empty',
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

test.each(states)('$name visual state stays stable', async ({ httpClient, name }) => {
  const shellDi = {
    featureFlagClient: createStaticFeatureFlagClient({}),
    httpClient,
    repositoryConfig,
    router: noopRouter,
  };

  await render(
    <QueryClientProvider client={createAppQueryClient()}>
      <IssuesRoute shellDi={shellDi} />
    </QueryClientProvider>,
  );

  await expect(page.getByTestId('route-panel')).toMatchScreenshot(name);
});
