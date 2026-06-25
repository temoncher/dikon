import { StrictMode, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppShell } from './app/AppShell';
import { RootDiContext, createRootDi } from './di';
import { createFeatureFlagClient } from './shared/featureFlags';
import { createHttpClient } from './shared/httpClient';
import { useWouterRouterService } from './shell/wouterRouterService';

import './app/App.css';

function RootDiProvider({ children }: { children: ReactNode }) {
  const router = useWouterRouterService();
  const featureFlagClient = useMemo(() => createFeatureFlagClient(), []);
  const httpClient = useMemo(() => createHttpClient(), []);
  // React owns the browser router and HTTP client lifetimes, then hands them to root DI.
  const rootDi = useMemo(
    () =>
      createRootDi().build({
        appConfig: {
          owner: 'temoncher',
          repo: 'dikon',
        },
        featureFlagClient,
        httpClient,
        router,
      }),
    [featureFlagClient, httpClient, router],
  );

  return <RootDiContext.Provider value={rootDi}>{children}</RootDiContext.Provider>;
}

function main() {
  // oxlint-disable-next-line unicorn/prefer-query-selector
  const root = document.getElementById('root');

  if (root === null) {
    throw new Error('Missing root element');
  }

  createRoot(root).render(
    <StrictMode>
      <RootDiProvider>
        <AppShell />
      </RootDiProvider>
    </StrictMode>,
  );
}

main();
