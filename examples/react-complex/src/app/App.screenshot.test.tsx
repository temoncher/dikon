import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { createFakeHttpClient } from '../test/fakeHttpClient';
import { AppShell } from './AppShell';
import { shellDiModule } from './shellDi';

test('repo lens shell visual state stays stable', async () => {
  await render(
    <AppShell diModule={shellDiModule.override({ baseHttpClient: createFakeHttpClient })} />,
  );

  await expect.element(page.getByText('Repository overview')).toBeVisible();
  await expect(page.getByTestId('repo-lens')).toMatchScreenshot('repo-lens');
});
