import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(?<colorControl>background|color)$/iu,
        date: /Date$/iu,
      },
    },
  },
};

export default preview;
