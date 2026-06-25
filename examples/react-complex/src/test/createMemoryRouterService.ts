import type { BaseLocationHook, HookNavigationOptions, Path } from 'wouter';

import type { AppRoute, RouterService } from '../shared/routerTypes';

interface MemoryLocation {
  readonly hook: BaseLocationHook;
  navigate(path: Path, options?: HookNavigationOptions<BaseLocationHook>): void;
}

const routePaths = {
  commits: '/commits',
  dashboard: '/',
  issues: '/issues',
} satisfies Record<AppRoute['id'], Path>;

export function createMemoryRouterService(location: MemoryLocation): RouterService {
  return {
    navigate: (route) => {
      location.navigate(routePaths[route.id]);
    },
  };
}
