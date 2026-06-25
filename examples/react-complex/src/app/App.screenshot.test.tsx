import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { RootDiContext, createRootDi } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
import { createFakeHttpClient } from '../test/fakeHttpClient';
import { AppShell } from './AppShell';

test('repo lens shell visual state stays stable', async () => {
  await render(
    <RootDiContext
      value={createRootDi().build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createFakeHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <AppShell />
    </RootDiContext>,
  );

  await expect.element(page.getByText('Repository overview')).toBeVisible();
  await expect(page.getByTestId('repo-lens')).toMatchScreenshot('repo-lens');
});
