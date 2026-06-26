import type { Meta, StoryObj } from '@storybook/react-vite';

import { RootDiContext, rootDikon } from '../di';
import { createFeatureFlagClient } from '../shared/featureFlags';
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
      <CommitsRoute />
    </RootDiContext>
  ),
};

export const Error: Story = {
  render: () => (
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createErrorHttpClient('Commits unavailable'),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <CommitsRoute />
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
      <CommitsRoute />
    </RootDiContext>
  ),
};

export const SuccessAuthorHidden: Story = {
  render: () => (
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient({
          'commits.showAuthor': false,
        }),
        httpClient: createFakeHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <CommitsRoute />
    </RootDiContext>
  ),
};

export const Empty: Story = {
  render: () => (
    <RootDiContext
      value={rootDikon.build({
        appConfig: { owner: 'temoncher', repo: 'dikon' },
        featureFlagClient: createFeatureFlagClient(),
        httpClient: createEmptyHttpClient(),
        router: {
          navigate: () => undefined,
        },
      })}
    >
      <CommitsRoute />
    </RootDiContext>
  ),
};
