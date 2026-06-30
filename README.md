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
const child = childDiModule.build(undefined, parent);
```

Calling `.require<T>()` is type-only. Use it when a parent container, test DI module, or earlier
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
- a shell container that accepts framework-owned router state and provides app-owned services,
- lazy route folders that each build their own child container,
- a reusable feature flag DI module that requires root flag infrastructure,
- a page-owned disposable refresh service that cleans up when the commits route unmounts,
- deterministic tests and stories that replace the live HTTP client through DI.

See [`examples/react-complex/README.md`](./examples/react-complex/README.md) for the route and DI
walkthrough.

That split is the reason to reach for hierarchical containers in a frontend: framework-owned
services such as router state can be adapted before DI, root app services such as HTTP, auth, flags,
or telemetry can live above route code, and route containers can be loaded and built later with
route-local config and dependencies.

```sh
cd examples/react-complex
pnpm install
pnpm dev
pnpm test
pnpm test:screenshot
pnpm storybook
```

## Advanced Usage

### Symbol Keys

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

### Reusable DI Modules

`.use(...)` merges another standalone DI module — its own `dikon()` chain — into the current one. Its
services become available here and satisfy any matching requirements; requirements it declares that
the current module does not already supply bubble up to build time.

DI modules are immutable. `provide`, `override`, and `use` return a new DI module rather than
mutating the one they were called on, and `build(...)` never mutates either. So you can compose a DI
module once at module scope, export it, and `build(...)` it repeatedly — each build is independent,
and branching with `override(...)` for a test or story cannot leak back into the shared DI module.

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

const httpClientDiModule = dikon()
  .require<{ config: { readonly baseUrl: string } }>()
  .provide({
    httpClient: ({ config }) => createHttpClient(config.baseUrl),
  });

const di = dikon()
  .use(httpClientDiModule)
  .provide({
    postsApi: ({ httpClient }) => createPostsApi(httpClient),
  })
  .build({ config: { baseUrl: 'https://api.example.com' } });
```

A DI module factory just returns a DI module, so it can be parameterized like any other function:

```ts
function createHttpClientDiModule(defaultHeaders: Readonly<Record<string, string>>) {
  return dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      httpClient: ({ config }) => createHttpClient(config.baseUrl, defaultHeaders),
    });
}
```

### Transient Services

Dikon does not have special lifetime syntax. A provided service is lazy and cached on the container
that built it. When you want a fresh value every time, provide a factory service instead of the
value itself:

```ts
interface Clock {
  now(): number;
}

const sessionDiModule = dikon()
  .require<{ clock: Clock; randomId: () => string }>()
  .provide({
    createSession({ clock, randomId }) {
      return () => ({
        id: randomId(),
        startedAt: clock.now(),
      });
    },
  });

const di = sessionDiModule.build({
  clock: { now: () => Date.now() },
  randomId: () => crypto.randomUUID(),
});

const first = di.createSession();
const second = di.createSession();

first === second; // false
```

The `createSession` function is cached like any other service, but each call creates a new session.
If you want a whole graph of services to be fresh for a request, route, job, or test case, build a
child container for that scope. Parent services are reused through the prototype chain, while local
providers cache inside the child container.

### Collection Services

Dikon also does not have built-in multitokens, multibindings, or collection injection where many
providers automatically append to the same key. Use explicit aggregation when several independent
factories contribute to one conceptual list. Each factory can return one contribution or many; the
app decides the final order in the collection provider:

This adds indirection, so keep plain providers when one module clearly owns the whole value.

```ts
type RequestHandler = (request: Request) => Promise<Response | undefined>;

interface AuditLog {
  record(request: Request): void;
}

const appDiModule = dikon()
  .require<{
    auditLog: AuditLog;
    rateLimitHandler: RequestHandler;
  }>()
  .provide({
    requestHandlers({ auditLog, rateLimitHandler }) {
      return [
        requireSignedInUser,
        createAuditHandler({ auditLog }),
        rateLimitHandler,
      ] as const satisfies readonly RequestHandler[];
    },
  });

function createAuditHandler({ auditLog }: { readonly auditLog: AuditLog }): RequestHandler {
  return async (request) => {
    auditLog.record(request);

    return undefined;
  };
}
```

That keeps the aggregation visible and ordinary. It also avoids hidden ordering rules: if auth must
run before audit, the `requestHandlers` provider is where that policy lives.

### Created Instances

For power-user cases, `dikon.instances(di)` returns a standard iterator over already-created service
instances. It does not initialize unread lazy services, and it does not include required values that
were passed to `build(...)`.

Values passed to `build(...)` are caller-owned inputs, not Dikon-created instances. Put values in
providers when you want them to be part of the container's created instance set.

Each entry is `[key, instance, ownerDi]`. The iterator starts at the container you pass, then walks
parent Dikon containers through the prototype chain.

```ts
for (const [key, instance, ownerDi] of dikon.instances(routeDi)) {
  if (ownerDi === appDi) {
    break;
  }

  // Handle route/request/job-scoped instances without touching app-scoped ones.
}
```

Instances are yielded from child containers to parent containers. Within each container, newer
instances are yielded before older ones, which is usually the useful order for cleanup.

### If You Really Need Disposal

Dikon does not manage lifetimes. Most frontend, Storybook, and test containers can just let normal
garbage collection handle unused instances. If a request, job, or command container owns services that
must be closed deterministically, one low-ceremony option is a local `Disposable` protocol.

```ts
const dispose = Symbol('dispose');

interface Disposable {
  [dispose](): void | Promise<void>;
}

function isDisposable(value: unknown): value is Disposable {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return false;
  }

  const candidate = value as Partial<Disposable>;

  return typeof candidate[dispose] === 'function';
}

async function disposeInstances(di: object, stopBefore: object) {
  // Different provider keys can resolve to the same object; dispose each object once.
  const seen = new Set<Disposable>();
  const disposals: Promise<void>[] = [];

  for (const [, instance, ownerDi] of dikon.instances(di)) {
    // Stop before disposing services owned by the parent lifetime boundary.
    if (ownerDi === stopBefore) {
      break;
    }

    if (!isDisposable(instance) || seen.has(instance)) {
      continue;
    }

    seen.add(instance);
    // Defer the call itself so cleanup code can finish before disposers run.
    disposals.push(Promise.resolve().then(() => instance[dispose]()));
  }

  await Promise.all(disposals);
}
```

Then services opt in by implementing the symbol method:

```ts
interface Connection extends Disposable {
  init(): Promise<void>;
  query(sql: string): Promise<unknown>;
}

const requestDiModule = dikon()
  .require<{ request: Request }>()
  .provide({
    connection() {
      return createConnection();
    },
  });

const requestDi = requestDiModule.build({ request }, appDi);

try {
  await requestDi.connection.init();
  await handleRequest(requestDi);
} finally {
  await disposeInstances(requestDi, appDi);
}
```

This is still explicit on purpose. Dikon only gives you access to the instances it has already
created; your app decides which protocol to look for, where the lifetime boundary is, and how to
handle disposal errors. Keep expensive startup in service methods such as `init()` or `start()`, or
in the request handler, not hidden inside provider factories.

The [`examples/react-complex`](./examples/react-complex) app includes a concrete disposable service
example: the commits page owns a `commitsRefreshService` timer, implements the local disposable
protocol, starts it explicitly while the route is visible, and clears that timer when the user
navigates away from the commits route.
