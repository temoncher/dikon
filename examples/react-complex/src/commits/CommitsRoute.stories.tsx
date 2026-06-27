import type { Meta, StoryObj } from '@storybook/react-vite';

import { createStaticFeatureFlagClient } from '../shared/featureFlags';
import {
  createEmptyHttpClient,
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import CommitsRoute from './CommitsRoute';

const meta = {
  title: 'Complex/Commits Route',
  component: CommitsRoute,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof CommitsRoute>;

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
    <CommitsRoute
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
    <CommitsRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createErrorHttpClient('Commits unavailable'),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Success: Story = {
  render: () => (
    <CommitsRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createFakeHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const SuccessAuthorHidden: Story = {
  render: () => (
    <CommitsRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({
          'commits.showAuthor': false,
        }),
        httpClient: createFakeHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <CommitsRoute
      shellDi={{
        featureFlagClient: createStaticFeatureFlagClient({}),
        httpClient: createEmptyHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};
