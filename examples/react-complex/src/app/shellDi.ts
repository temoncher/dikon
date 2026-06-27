import { dikon } from '../../../../dikon.ts';
import { createCommitsSidebarMenuItem } from '../commits/commitsSidebarMenu';
import { createDashboardSidebarMenuItem } from '../dashboard/dashboardSidebarMenu';
import { createIssuesSidebarMenuItem } from '../issues/issuesSidebarMenu';
import { createStaticFeatureFlagClient } from '../shared/featureFlags';
import type { RepositoryConfig } from '../shared/githubTypes';
import { createHttpClient, createObservedHttpClient } from '../shared/httpClient';
import {
  createRequestContextFactory,
  createRequestLog,
  createRequestObservers,
} from '../shared/requestTracking';
import type { RouterService } from '../shared/routerTypes';

interface AppConfig {
  readonly owner: string;
  readonly repo: string;
}

interface ShellBuildValues {
  readonly appConfig: AppConfig;
  readonly router: RouterService;
}

const GITHUB_API_BASE_URL = 'https://api.github.com';
const DEFAULT_FEATURE_FLAGS: Readonly<Record<string, boolean>> = {};

function createRepositoryConfig({ appConfig }: ShellBuildValues): RepositoryConfig {
  return {
    owner: appConfig.owner,
    repo: appConfig.repo,
    fullName: `${appConfig.owner}/${appConfig.repo}`,
  };
}

// Shell DI accepts framework-owned inputs flat, then derives shared values for lazy route DI.
// The dikon is composed once at module scope and built (never mutated) per provider.
export const shellDiModule = dikon()
  .require<ShellBuildValues>()
  .provide({
    repositoryConfig: createRepositoryConfig,
    baseHttpClient() {
      return createHttpClient({ apiBaseUrl: GITHUB_API_BASE_URL });
    },
    featureFlagClient() {
      return createStaticFeatureFlagClient(DEFAULT_FEATURE_FLAGS);
    },
    requestLog() {
      return createRequestLog();
    },
    createRequestContext: createRequestContextFactory,
  })
  .provide({
    requestObservers: createRequestObservers,
    sidebarMenuItems({ router }) {
      return [
        createDashboardSidebarMenuItem({ router }),
        createCommitsSidebarMenuItem({ router }),
        createIssuesSidebarMenuItem({ router }),
      ] as const;
    },
  })
  .provide({
    httpClient({ baseHttpClient, createRequestContext, requestObservers }) {
      return createObservedHttpClient({
        baseHttpClient,
        createRequestContext,
        requestObservers,
      });
    },
  });

export type ShellDi = dikon.Of<typeof shellDiModule>;
