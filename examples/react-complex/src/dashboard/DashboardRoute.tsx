import { use, useMemo } from 'react';

import { RootDiContext } from '../di';
import { useAsyncValue } from '../shared/useAsyncValue';
import { dashboardDikon } from './dashboardDi';

export default function DashboardRoute() {
  const rootDi = use(RootDiContext);
  const di = useMemo(() => dashboardDikon.build(undefined, rootDi), [rootDi]);
  const summary = useAsyncValue(di.loadRepository);

  return (
    <section className='repo-lens__panel' data-testid='route-panel'>
      <p className='repo-lens__section-title'>{di.routeMetadata.title}</p>
      {summary.loading ? <p>Loading repository...</p> : null}
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
            <button onClick={() => rootDi.router.navigate({ id: 'commits' })} type='button'>
              View commits
            </button>
            <button onClick={() => rootDi.router.navigate({ id: 'issues' })} type='button'>
              View issues
            </button>
          </div>
        </>
      )}
    </section>
  );
}
