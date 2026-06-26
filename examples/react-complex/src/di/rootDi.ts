import { dikon } from '../../../../dikon.ts';
import type { FeatureFlagClient } from '../shared/featureFlags';
import type { RepositoryConfig } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';
import type { RouterService } from '../shared/routerTypes';

interface AppConfig {
  readonly owner: string;
  readonly repo: string;
}

interface RootBuildValues {
  readonly appConfig: AppConfig;
  readonly featureFlagClient: FeatureFlagClient;
  readonly httpClient: HttpClient;
  readonly router: RouterService;
}

function createRepositoryConfig({ appConfig }: RootBuildValues): RepositoryConfig {
  return {
    owner: appConfig.owner,
    repo: appConfig.repo,
    fullName: `${appConfig.owner}/${appConfig.repo}`,
  };
}

// Root DI accepts React-owned services flat, then derives shared values for lazy route DI.
// The dikon is composed once at module scope and built (never mutated) per provider.
export const rootDikon = dikon().require<RootBuildValues>().provide({
  repositoryConfig: createRepositoryConfig,
});

export type RootDi = dikon.Of<typeof rootDikon>;
