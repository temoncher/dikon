import { Suspense, lazy, use } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { useLocation } from 'wouter';

import { RootDiContext } from '../di';
import type { AppRoute } from '../shared/routerTypes';
import { pathToRoute } from '../shell/wouterRouterService';

const routes = {
  dashboard: lazy(() => import('../dashboard/DashboardRoute')),
  commits: lazy(() => import('../commits/CommitsRoute')),
  issues: lazy(() => import('../issues/IssuesRoute')),
} satisfies Record<AppRoute['id'], LazyExoticComponent<ComponentType>>;

export function AppShell() {
  const rootDi = use(RootDiContext);
  const [location] = useLocation();
  const route = pathToRoute(location);

  const RouteComponent = routes[route.id];

  return (
    <main className='repo-lens' data-testid='repo-lens'>
      <header className='repo-lens__header'>
        <div>
          <p className='repo-lens__eyebrow'>Repo Lens</p>
          <h1>{rootDi.repositoryConfig.fullName}</h1>
          <p className='repo-lens__tagline'>A GitHub API example with root and route containers.</p>
        </div>
        <nav className='repo-lens__nav' aria-label='Repo sections'>
          <button
            aria-pressed={route.id === 'dashboard'}
            onClick={() => rootDi.router.navigate({ id: 'dashboard' })}
            type='button'
          >
            Overview
          </button>
          <button
            aria-pressed={route.id === 'commits'}
            onClick={() => rootDi.router.navigate({ id: 'commits' })}
            type='button'
          >
            Commits
          </button>
          <button
            aria-pressed={route.id === 'issues'}
            onClick={() => rootDi.router.navigate({ id: 'issues' })}
            type='button'
          >
            Issues
          </button>
        </nav>
      </header>

      <Suspense fallback={<p className='repo-lens__loading'>Loading route...</p>}>
        <RouteComponent />
      </Suspense>
    </main>
  );
}
