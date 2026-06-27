import { useMemo } from 'react';

import type { RouterService } from '../shared/routerTypes';
import { useAsyncValue } from '../shared/useAsyncValue';
import { dashboardDiModule } from './dashboardDi';
import type { DashboardDeps } from './dashboardDi';

interface DashboardRouteProps {
  readonly shellDi: DashboardDeps & { readonly router: RouterService };
}

export default function DashboardRoute({ shellDi }: DashboardRouteProps) {
  const di = useMemo(() => dashboardDiModule.build(undefined, shellDi), [shellDi]);
  const summary = useAsyncValue(di.loadRepository);

  return (
    <section className='repo-lens__panel' data-testid='route-panel'>
      <p className='repo-lens__section-title'>{di.routeMetadata.title}</p>
      {summary.isPending ? <p>Loading repository...</p> : null}
      {summary.error === null ? null : <p role='alert'>{summary.error}</p>}
      {summary.value === null ? null : (
        <>
          <h2>{summary.value.fullName}</h2>
          <p>{summary.value.description}</p>
          <dl className='repo-lens__stats'>
            <div>
              <dt>Stars</dt>
              <dd>{summary.value.stars}</dd>
            </div>
            <div>
              <dt>Forks</dt>
              <dd>{summary.value.forks}</dd>
            </div>
            <div>
              <dt>Open issues</dt>
              <dd>{summary.value.openIssues}</dd>
            </div>
          </dl>
          <div className='repo-lens__actions'>
            <button onClick={() => shellDi.router.navigate({ id: 'commits' })} type='button'>
              View commits
            </button>
            <button onClick={() => shellDi.router.navigate({ id: 'issues' })} type='button'>
              View issues
            </button>
          </div>
        </>
      )}
    </section>
  );
}
