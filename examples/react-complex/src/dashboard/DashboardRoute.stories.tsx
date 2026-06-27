import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  createErrorHttpClient,
  createFakeHttpClient,
  createLoadingHttpClient,
} from '../test/fakeHttpClient';
import DashboardRoute from './DashboardRoute';

const meta = {
  title: 'Complex/Dashboard Route',
  component: DashboardRoute,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DashboardRoute>;

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
    <DashboardRoute
      shellDi={{
        httpClient: createLoadingHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <DashboardRoute
      shellDi={{
        httpClient: createErrorHttpClient('Repository unavailable'),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};

export const Success: Story = {
  render: () => (
    <DashboardRoute
      shellDi={{
        httpClient: createFakeHttpClient(),
        repositoryConfig,
        router: noopRouter,
      }}
    />
  ),
};
