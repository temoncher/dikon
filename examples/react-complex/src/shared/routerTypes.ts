export type AppRoute =
  | { readonly id: 'dashboard' }
  | { readonly id: 'commits' }
  | { readonly id: 'issues' };

export interface RouterService {
  navigate(route: AppRoute): void;
}
