import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { RootDiContext, createRootDi } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
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

test.each(states)('$name visual state stays stable', async ({ httpClient, name }) => {
  await render(
    <RootDiContext
      value={createRootDi().build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient,
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <DashboardRoute />
    </RootDiContext>,
  );

  await expect(page.getByTestId('route-panel')).toMatchScreenshot(name);
});
