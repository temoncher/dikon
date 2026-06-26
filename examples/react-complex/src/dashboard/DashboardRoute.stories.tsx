import type { Meta, StoryObj } from '@storybook/react-vite';

import { RootDiContext, rootDikon } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
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

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createLoadingHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <DashboardRoute />
    </RootDiContext>
  ),
};

export const Error: Story = {
  render: () => (
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createErrorHttpClient('Repository unavailable'),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <DashboardRoute />
    </RootDiContext>
  ),
};

export const Success: Story = {
  render: () => (
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createFakeHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <DashboardRoute />
    </RootDiContext>
  ),
};
