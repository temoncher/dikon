import { defineConfig } from 'oxfmt';

export default defineConfig({
  jsxSingleQuote: true,
  singleQuote: true,
  sortImports: {
    groups: ['builtin', 'external', ['parent', 'sibling', 'index'], 'style', 'unknown'],
    order: 'asc',
  },
});
