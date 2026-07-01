import { QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { createAppQueryClient } from '../app/queryClient';
import {
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import DashboardRoute from './DashboardRoute';

const states = [
  {
    httpClient: createLoadingHttpClient(),
    name: 'dashboard-loading',
  },
  {
    httpClient: createErrorHttpClient('Repository unavailable'),
    name: 'dashboard-error',
  },
  {
    httpClient: createFakeHttpClient(),
    name: 'dashboard-success',
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
    httpClient,
    repositoryConfig,
    router: noopRouter,
  };

  await render(
    <QueryClientProvider client={createAppQueryClient()}>
      <DashboardRoute shellDi={shellDi} />
    </QueryClientProvider>,
  );

  await expect(page.getByTestId('route-panel')).toMatchScreenshot(name);
});
