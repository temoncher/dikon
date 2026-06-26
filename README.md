# Dikon

Dikon is a tiny TypeScript dependency injection helper for building typed service containers with
almost no runtime machinery.

It is intentionally small enough to copy into a project. There is no npm package to install and no
published package workflow in this repository. Copy [`dikon.ts`](./dikon.ts) into your source tree,
import it from there, and keep the copy close to the application code that uses it.

## Copy Into A Project

1. Copy `dikon.ts` into your project, for example `src/dikon.ts`.
2. Import it with a local path.
3. Commit the copied file with your project.

```ts
import { dikon } from './dikon';
```

## Basic Usage

Declare required values with `.require<T>()`, provide services in layers, and call `build()` with the
required values.

```ts
import { dikon } from './dikon';

const createHttpClient = (baseUrl: string) => ({
  get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
});

const createPostsApi = (httpClient: ReturnType<typeof createHttpClient>) => ({
  list: () => httpClient.get<readonly { id: number; title: string }[]>('/posts'),
});

const di = dikon()
  .require<{ config: { readonly baseUrl: string } }>()
  .provide({
    httpClient: ({ config }) => createHttpClient(config.baseUrl),
  })
  .provide({
    postsApi: ({ httpClient }) => createPostsApi(httpClient),
  })
  .build({ config: { baseUrl: 'https://api.example.com' } });

await di.postsApi.list(); // GET https://api.example.com/posts
```

Providers are lazy by default. A provider factory runs the first time its service is read, then the
result is cached on that container.

Use `buildEager()` when you want all providers constructed during the build step.

Built containers expose local build values and services as own enumerable properties. Those
properties are shallow readonly: you cannot replace `di.service`, but the service object can still
manage its own state. Spreading a lazy container reads its enumerable services, so it initializes
them.

## Parent Containers

A container can read from a parent container. Local build values and local providers take
precedence, then missing values fall through to the parent through the prototype chain. Inherited
lazy services stay cached on the parent that defined them.

```ts
const rootDi = dikon()
  .provide({
    config() {
      return { baseUrl: 'https://root.test' };
    },
  })
  .build();

const app = dikon()
  .require<typeof rootDi>()
  .require<{ path: string }>()
  .provide({
    url({ config, path }) {
      return `${config.baseUrl}${path}`;
    },
  })
  .build({ path: '/posts' }, rootDi);

app.url; // "https://root.test/posts"
```

If the child container has no local required values and only needs a parent, pass `undefined` as the
first build argument:

```ts
const child = childDikon.build(undefined, parent);
```

Calling `.require<T>()` is type-only. Use it when a parent container, test dikon, or earlier
provider will satisfy those values.

## Overrides

Use `.override(...)` to replace a service that already exists while preserving its public type.

```ts
const di = dikon()
  .provide({
    clock() {
      return { now: () => Date.now() };
    },
  })
  .override({
    clock: () => ({ now: () => 0 }),
  })
  .build();

di.clock.now(); // 0
```

## Development

This repository exists to keep the copyable source tested and formatted.

```sh
pnpm install
pnpm test
pnpm test:types
pnpm typecheck
pnpm lint
pnpm format
```

The package is marked `"private": true` because Dikon is intended to be copied, not published.

## Examples

The React examples show two different adoption levels.

[`examples/react-simple`](./examples/react-simple) is the smallest useful shape: one app, one
dikon, no React context, and the built container passed through props.
See [`examples/react-simple/README.md`](./examples/react-simple/README.md) for the walkthrough.

```sh
cd examples/react-simple
pnpm install
pnpm dev
pnpm test
```

[`examples/react-complex`](./examples/react-complex) is a developer-facing Repo Lens app wired to
the public GitHub API. It shows:

- an app shell that adapts the `wouter` router into a small service before DI,
- a root container that accepts those externally initialized services,
- lazy route folders that each build their own child container,
- a reusable feature flag dikon that requires root flag infrastructure,
- deterministic tests and stories that replace the live HTTP client through DI.

See [`examples/react-complex/README.md`](./examples/react-complex/README.md) for the route and DI
walkthrough.

That split is the reason to reach for hierarchical containers in a frontend: React-owned services
such as router state, HTTP clients, auth, flags, or telemetry can exist before a route is
downloaded, while route containers can be loaded and built later with route-local config and
dependencies.

```sh
cd examples/react-complex
pnpm install
pnpm dev
pnpm test
pnpm test:screenshot
pnpm storybook
```

## Symbol Keys

Dikon uses normal JavaScript property keys, so symbol-keyed services also work. Reach for this only
when a string key would be too easy to collide with.

```ts
const CONFIG = Symbol('config');
const URL = Symbol('url');

const di = dikon()
  .require<{ [CONFIG]: { readonly baseUrl: string } }>()
  .provide({
    [URL]({ [CONFIG]: config }) {
      return `${config.baseUrl}/posts`;
    },
  })
  .build({ [CONFIG]: { baseUrl: 'https://api.test' } });

di[URL]; // "https://api.test/posts"
```

## Reusable Dikons

`.use(...)` merges another standalone dikon — its own `dikon()` chain — into the current one. Its
services become available here and satisfy any matching requirements; requirements it declares that
the current dikon does not already supply bubble up to build time.

Because that dikon is authored from `dikon()` with concrete types, it is type-checked once, in
isolation. That is the difference from threading a generically-typed dikon through a helper: there
are no free `TExistingDeps`/`TRequires` parameters to re-instantiate at each call site, and a dikon
defined once pays its type-checking cost once no matter how many places `use` it.

Dikons are immutable. `provide`, `override`, and `use` return a new dikon rather than mutating the
one they were called on, and `build(...)` never mutates either. So you can compose a dikon once at
module scope, export it, and `build(...)` it repeatedly — each build is independent, and branching
with `override(...)` for a test or story cannot leak back into the shared dikon.

```ts
export const appDi = dikon()
  .require<{ config: { readonly baseUrl: string } }>()
  .provide({ httpClient: ({ config }) => createHttpClient(config.baseUrl) });

// In a test: override branches off a copy; the exported appDi is untouched.
const testDi = appDi
  .override({ httpClient: () => fakeHttpClient })
  .build({ config: { baseUrl: 'https://api.test' } });
```

```ts
const createHttpClient = (baseUrl: string) => ({
  get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
});

const createPostsApi = (httpClient: ReturnType<typeof createHttpClient>) => ({
  list: () => httpClient.get<readonly { id: number; title: string }[]>('/posts'),
});

const httpClientDikon = dikon()
  .require<{ config: { readonly baseUrl: string } }>()
  .provide({
    httpClient: ({ config }) => createHttpClient(config.baseUrl),
  });

const di = dikon()
  .use(httpClientDikon)
  .provide({
    postsApi: ({ httpClient }) => createPostsApi(httpClient),
  })
  .build({ config: { baseUrl: 'https://api.example.com' } });
```

A dikon factory just returns a dikon, so it can be parameterized like any other function:

```ts
function createHttpClientDikon(defaultHeaders: Readonly<Record<string, string>>) {
  return dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      httpClient: ({ config }) => createHttpClient(config.baseUrl, defaultHeaders),
    });
}
```

## If You Really Need Disposal

Dikon does not manage lifetimes. Most frontend, Storybook, and test containers can just let normal
garbage collection handle unused instances. If a backend request container opens something that must
be closed deterministically, keep cleanup as ordinary services instead of adding lifecycle rules to
every provider.

```ts
const disposalDikon = dikon()
  .provide({
    disposables(): Array<() => void | Promise<void>> {
      return [];
    },
  })
  .provide({
    defer({ disposables }) {
      return (dispose: () => void | Promise<void>) => {
        disposables.push(dispose);
      };
    },
    dispose({ disposables }) {
      return async () => {
        for (const dispose of [...disposables].reverse()) {
          await dispose();
        }
      };
    },
  });

const requestDi = dikon()
  .use(disposalDikon)
  .provide({
    connection({ defer }) {
      const connection = openConnection();

      defer(() => connection.close());

      return connection;
    },
  })
  .build({ request }, app);

try {
  await handleRequest(requestDi);
} finally {
  await requestDi.dispose();
}
```

Lazy providers only register cleanup if they are actually read. If you need a different disposal
order or error policy, keep that policy in this local recipe.
