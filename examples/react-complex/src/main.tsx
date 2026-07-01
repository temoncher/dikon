import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { AppShell } from './app/AppShell';
import { createAppQueryClient } from './app/queryClient';

import './app/App.css';

const queryClient = createAppQueryClient();

function main() {
  // oxlint-disable-next-line unicorn/prefer-query-selector
  const root = document.getElementById('root');

  if (root === null) {
    throw new Error('Missing root element');
  }

  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>,
  );
}

main();
