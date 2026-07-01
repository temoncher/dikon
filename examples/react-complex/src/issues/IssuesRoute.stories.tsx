import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';

import { createAppQueryClient } from '../app/queryClient';
import { createStaticFeatureFlagClient } from '../shared/featureFlags';
import {
  createEmptyHttpClient,
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import IssuesRoute from './IssuesRoute';

const meta = {
  title: 'Complex/Issues Route',
  component: IssuesRoute,
  decorators: [
    (Story) => (
      <QueryClientProvider client={createAppQueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof IssuesRoute>;

export default meta;

type Story = StoryObj;

const repositoryConfig = {
  owner: 'temoncher',
  repo: 'dikon',
  fullName: 'temoncher/dikon',
};

const noopRouter = {
  navigate: () => undefined,
};

export const Loading: Story = {
  render: () => (
    <IssuesRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createLoadingHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <IssuesRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createErrorHttpClient('Issues unavailable'),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Success: Story = {
  render: () => (
    <IssuesRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createFakeHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <IssuesRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createEmptyHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};
