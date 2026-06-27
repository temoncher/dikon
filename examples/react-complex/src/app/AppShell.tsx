import { Suspense, lazy, useMemo } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { useLocation } from 'wouter';

import type { AppRoute } from '../shared/routerTypes';
import { shellDiModule } from './shellDi';
import type { ShellDi } from './shellDi';
import { pathToRoute, useWouterRouterService } from './wouterRouterService';

const routes = {
  dashboard: lazy(() => import('../dashboard/DashboardRoute')),
  commits: lazy(() => import('../commits/CommitsRoute')),
  issues: lazy(() => import('../issues/IssuesRoute')),
} satisfies Record<
  AppRoute['id'],
  LazyExoticComponent<ComponentType<{ readonly shellDi: ShellDi }>>
>;

type ShellDiModule = typeof shellDiModule;

interface AppShellProps {
  readonly diModule?: ShellDiModule;
}

export function AppShell({ diModule = shellDiModule }: AppShellProps) {
  const router = useWouterRouterService();
  const shellDi = useMemo(
    () =>
      diModule.build({
        appConfig: {
          owner: 'temoncher',
          repo: 'dikon',
        },
        router,
      }),
    [diModule, router],
  );
  const [location] = useLocation();
  const route = pathToRoute(location);

  const RouteComponent = routes[route.id];

  return (
    <main className='repo-lens' data-testid='repo-lens'>
      <header className='repo-lens__header'>
        <div>
          <p className='repo-lens__eyebrow'>Repo Lens</p>
          <h1>{shellDi.repositoryConfig.fullName}</h1>
          <p className='repo-lens__tagline'>
            A GitHub API example with shell and route containers.
          </p>
        </div>
        <nav className='repo-lens__nav' aria-label='Repo sections'>
          {shellDi.sidebarMenuItems.map((item) => (
            <button
              aria-pressed={route.id === item.id}
              key={item.id}
              onClick={item.select}
              type='button'
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <Suspense fallback={<p className='repo-lens__loading'>Loading route...</p>}>
        <RouteComponent shellDi={shellDi} />
      </Suspense>
    </main>
  );
}
