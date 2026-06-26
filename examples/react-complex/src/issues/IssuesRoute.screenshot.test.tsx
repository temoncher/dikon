import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { RootDiContext, rootDikon } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
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

test.each(states)('$name visual state stays stable', async ({ httpClient, name }) => {
  await render(
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient,
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <IssuesRoute />
    </RootDiContext>,
  );

  await expect(page.getByTestId('route-panel')).toMatchScreenshot(name);
});
