# React Complex Example

This example shows why hierarchical containers can be useful in a real React app.

Repo Lens is split into an eagerly loaded app shell and three lazy route domains:

- `dashboard`
- `commits`
- `issues`

The shell builds shell DI immediately. Each route module is downloaded later and builds its own
child container from the shell container.

## What It Shows

- Framework-owned services entering DI from the outside.
- A shell container shared by lazy route containers.
- A reusable DI module that turns declared feature flags into typed route services.
- Feature-owned sidebar menu item factories collected by the app shell.
- A concrete disposable service: the commits page owns a refresh timer and cleans it up.
- Optional request tracking that wraps a base HTTP client with a transient factory and explicit
  observer list.
- Domain folders that keep components, services, stories, and screenshot tests together.
- Tests and stories replacing shell HTTP and flag services through DI overrides.

## Shell DI

`src/main.tsx` creates the service that is naturally owned by React:

- the `wouter` router adapter.

The router and static app configuration are passed flat into `shellDiModule.build(...)`. Shell DI
provides regular app services such as the base HTTP client and static feature flag client with named
provider functions, then derives `repositoryConfig`, a stable repository target that child route
containers can reuse without knowing how the shell was created. It also collects route-owned sidebar
menu item factories into `sidebarMenuItems`, and exposes `httpClient`, the app-facing client observed
by the request tracking factory.

## Route DI

Each route folder has a `*Di.ts` file that composes and exports a DI module at module scope (for
example `commitsDiModule`). `AppShell` builds shell DI from the React-owned router and passes
`shellDi` to the lazy route component as a prop. Building is pure — the route component calls
`commitsDiModule.build(undefined, shellDi)` and the shared DI module is never mutated. A route DI
module:

- requires only the shell services it reads,
- uses plain providers for route metadata,
- `use`s a declared feature flag DI module when the route needs typed flags,
- provides its domain-specific GitHub request loader.

This keeps route folders independent while still sharing shell services such as routing and the
repository config.

## Sidebar Menu Contributions

Dashboard, commits, and issues each keep a small `*SidebarMenu.ts` module beside the route DI file.
Each one exports a plain factory for its sidebar item, such as `createCommitsSidebarMenuItem`. The
shell calls those factories inside the `sidebarMenuItems` provider, so the collection is the only
menu service exposed by DI.

This is the collection-service pattern in this example: each feature owns its contribution, but the
app shell owns the final order and the final collection name. Dikon does not need special multitoken
syntax for this shape, and the individual contributions do not need to be DI services.

## Disposable Services

`src/shared/disposable.ts` copies the README's low-ceremony cleanup shape into the app: services opt
in with a local symbol method, and `disposeModuleDisposables(di)` walks already-created instances
with `dikon.instances(...)`.

The concrete page-owned service in this example is `commitsRefreshService` in
`src/commits/commitsDi.ts`. `start(commits.refresh)` starts a `setInterval(...)` refresh timer while
the commits page is visible, and `dispose()` clears the timer when the user navigates away from the
commits route. `CommitsRoute` gives it the imperative `commits.refresh` handle returned by
`useAsyncValue(...)`, starts the service directly, and disposes that child route DI from the route
unmount cleanup.

Route request cancellation is separate from this disposable-service example: in-flight route requests
are canceled by the fresh abort signal passed into each `useAsyncValue(...)` load.

## Reusable DI Module

`src/shared/featureFlags.ts` contains the reusable DI module factory. Each route declares the flags it
consumes:

```ts
const commitsFlagsDiModule = createFeatureFlagsDiModule({
  namespace: 'commits',
  flags: {
    compactList: false,
    showAuthor: true,
  },
});
```

The DI module requires the shell `featureFlagClient` and provides `featureFlags`, with typed boolean
properties from the declaration.

That is the shape where a reusable DI module helps: one configured feature needs parent infrastructure
and provides route-local services. Simpler route metadata stays as plain `.provide(...)` calls.

## Request Tracking Patterns

`src/shared/requestTracking.ts` is intentionally more advanced than the rest of the example. Most
apps can live perfectly well with ordinary cached services and direct providers. Use these patterns
only when they solve a real lifetime or composition problem, because they add indirection.

This app uses request tracking to show two optional shapes:

- `createRequestContext` is a transient factory service. The factory itself is cached on shell DI,
  but each observed HTTP call creates a fresh request context with its own id and operation name.
- `requestLog` is a bounded sliding window of recent request events.
- `requestObservers` is a normal factory service that returns the observer list used by the HTTP
  wrapper.

Shell DI keeps the pattern at the HTTP boundary: it provides `baseHttpClient`, wraps it with request
tracking, and exposes the observed `httpClient`. Route loaders still just call
`httpClient.get(...)`, and route components still call `di.loadRepository()`, `di.loadCommits()`, or
`di.loadIssues()`.

## Tests And Stories

Stories and screenshot tests live beside each route. They build DI explicitly at the render site and
pass plain objects for the shell services each route reads. The app shell owns `shellDiModule`; route
stories and route tests only provide object-shaped mocks for loading, error, success, empty, and
feature-flagged states.

## Run It

```sh
pnpm install
pnpm dev
pnpm test
pnpm test:screenshot
pnpm storybook
pnpm build
```
