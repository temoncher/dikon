import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { RootDiContext, createRootDi } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
import {
  createEmptyHttpClient,
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import CommitsRoute from './CommitsRoute';

const states = [
  {
    httpClient: createLoadingHttpClient(),
    name: 'commits-loading',
  },
  {
    httpClient: createErrorHttpClient('Commits unavailable'),
    name: 'commits-error',
  },
  {
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
    httpClient: createEmptyHttpClient(),
    name: 'commits-empty',
  },
];

test.each(states)(
  '$name visual state stays stable',
  async ({ featureFlagOverrides = {}, httpClient, name }) => {
    await render(
      <RootDiContext
        value={createRootDi().build({
          appConfig: { owner: 'temoncher', repo: 'dikon' },
          featureFlagClient: createFeatureFlagClient(featureFlagOverrides),
          httpClient,
          router: {
            navigate: () => undefined,
          },
        })}
      >
        <CommitsRoute />
      </RootDiContext>,
    );

    await expect(page.getByTestId('route-panel')).toMatchScreenshot(name);
  },
);
