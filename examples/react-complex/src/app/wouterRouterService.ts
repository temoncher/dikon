import { useMemo } from 'react';
import { useLocation } from 'wouter';

import type { AppRoute, RouterService } from '../shared/routerTypes';

function routeToPath(route: AppRoute) {
  switch (route.id) {
    case 'commits': {
      return '/commits';
    }
    case 'issues': {
      return '/issues';
    }
    case 'dashboard': {
      return '/';
    }
  }
}

export function pathToRoute(path: string): AppRoute {
  switch (path) {
    case '/commits': {
      return { id: 'commits' };
    }
    case '/issues': {
      return { id: 'issues' };
    }
    default: {
      return { id: 'dashboard' };
    }
  }
}

export function createWouterRouterService(navigate: (path: string) => void): RouterService {
  // React owns browser routing; DI only receives route navigation commands.
  return {
    navigate: (route) => {
      navigate(routeToPath(route));
    },
  };
}

export function useWouterRouterService(): RouterService {
  const [, navigate] = useLocation();

  return useMemo(() => createWouterRouterService(navigate), [navigate]);
}
