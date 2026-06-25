import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import { RootDiContext, createRootDi } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
import { createMemoryRouterService } from '../test/createMemoryRouterService';
import { createFakeHttpClient } from '../test/fakeHttpClient';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  test('keeps root services in the shell while route bundles load lazily', async () => {
    const location = memoryLocation();
    const rootDi = createRootDi().build({
      appConfig: {
        owner: 'temoncher',
        repo: 'dikon',
      },
      featureFlagClient: createFeatureFlagClient(),
      httpClient: createFakeHttpClient(),
      router: createMemoryRouterService(location),
    });

    function TestApp() {
      return (
        <Router hook={location.hook}>
          <RootDiContext value={rootDi}>
            <AppShell />
          </RootDiContext>
        </Router>
      );
    }

    render(<TestApp />);

    expect(screen.getByText('Loading route...')).toBeInTheDocument();

    await expect(screen.findByText('Repository overview')).resolves.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'temoncher/dikon', level: 1 })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Commits' }));

    await expect(screen.findByText('Recent commits')).resolves.toBeInTheDocument();
    await expect(screen.findByText('Add repository lens example')).resolves.toBeInTheDocument();
  });
});
