import { createRoot } from 'react-dom/client';

import { AppShell } from './app/AppShell';

import './app/App.css';

function main() {
  // oxlint-disable-next-line unicorn/prefer-query-selector
  const root = document.getElementById('root');

  if (root === null) {
    throw new Error('Missing root element');
  }

  createRoot(root).render(<AppShell />);
}

main();
