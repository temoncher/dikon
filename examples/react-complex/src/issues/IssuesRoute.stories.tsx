import type { Meta, StoryObj } from '@storybook/react-vite';

import { RootDiContext, createRootDi } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
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
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof IssuesRoute>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <RootDiContext
      value={createRootDi().build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createLoadingHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <IssuesRoute />
    </RootDiContext>
  ),
};

export const Error: Story = {
  render: () => (
    <RootDiContext
      value={createRootDi().build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createErrorHttpClient('Issues unavailable'),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <IssuesRoute />
    </RootDiContext>
  ),
};

export const Success: Story = {
  render: () => (
    <RootDiContext
      value={createRootDi().build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createFakeHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <IssuesRoute />
    </RootDiContext>
  ),
};

export const Empty: Story = {
  render: () => (
    <RootDiContext
      value={createRootDi().build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createEmptyHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <IssuesRoute />
    </RootDiContext>
  ),
};
