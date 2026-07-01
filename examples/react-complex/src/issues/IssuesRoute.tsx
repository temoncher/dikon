import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { RouterService } from '../shared/routerTypes';
import { issuesDiModule } from './issuesDi';
import type { IssuesDeps } from './issuesDi';

interface IssuesRouteProps {
  readonly shellDi: IssuesDeps & { readonly router: RouterService };
}

export default function IssuesRoute({ shellDi }: IssuesRouteProps) {
  const di = useMemo(() => issuesDiModule.build(undefined, shellDi), [shellDi]);
  const issues = useQuery({
    queryFn: ({ signal }) => di.loadIssues({ signal }),
    queryKey: ['issues', shellDi.repositoryConfig.fullName],
  });

  return (
    <section className='repo-lens__panel' data-testid='route-panel'>
      <p className='repo-lens__section-title'>{di.routeMetadata.title}</p>
      {issues.isPending ? <p>Loading issues...</p> : null}
      {issues.error === null ? null : <p role='alert'>{issues.error.message}</p>}
      {issues.data?.length === 0 ? <p>{di.routeMetadata.emptyText}</p> : null}
      <ul className='repo-lens__list'>
        {issues.data?.map((issue) => (
          <li key={issue.number}>
            <a href={issue.htmlUrl}>
              #{issue.number} {issue.title}
            </a>
            {di.featureFlags.showAuthor ? <span>opened by {issue.authorLogin}</span> : null}
          </li>
        ))}
      </ul>
      <div className='repo-lens__actions'>
        <button onClick={() => shellDi.router.navigate({ id: 'dashboard' })} type='button'>
          Back to overview
        </button>
        <button onClick={() => shellDi.router.navigate({ id: 'commits' })} type='button'>
          View commits
        </button>
      </div>
    </section>
  );
}
