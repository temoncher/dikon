import { assertType, expectTypeOf, test } from 'vitest';

import { dikon } from './dikon';

test('types reusable standalone dikons through use', () => {
  const parent = dikon()
    .provide({
      config() {
        return 10;
      },
    })
    .build();
  const fortyTwoDikon = dikon()
    .require<{ config: number }>()
    .provide({
      fortyTwo(di) {
        return di.config + 32;
      },
    });

  const child = dikon().require<typeof parent>().use(fortyTwoDikon).build(undefined, parent);

  assertType<number>(child.fortyTwo);
});

test('returns readonly build output', () => {
  const appDikon = dikon().provide({
    value() {
      return 'ready';
    },
  });

  type Dependencies = dikon.Of<typeof appDikon>;
  const deps = appDikon.build();

  assertType<Readonly<{ value: string }>>(deps);
  assertType<Readonly<{ value: string }>>({} as Dependencies);

  // @ts-expect-error build output is readonly
  deps.value = 'changed';
});

test('keeps required build values readonly in build output', () => {
  const di = dikon().require<{ config: number }>().build({ config: 10 });

  // @ts-expect-error required build values are readonly on the container
  di.config = 11;
});

test('passes readonly dependencies to providers and overrides', () => {
  dikon()
    .provide({
      config() {
        return 10;
      },
      other() {
        return 1;
      },
    })
    .provide({
      badProvider(di) {
        // @ts-expect-error provider dependencies are readonly
        di.config = 11;

        return di.config;
      },
    })
    .override({
      config: (di) => {
        // @ts-expect-error override dependencies are readonly
        di.other = 2;

        return di.other;
      },
    });
});

test('infers required and provided dependencies', () => {
  const createHttpClient = (baseUrl: string) => ({
    get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
  });
  const createPostsApi = (httpClient: ReturnType<typeof createHttpClient>) => ({
    list: () => httpClient.get<readonly { id: number; title: string }[]>('/posts'),
  });

  const appDikon = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      httpClient: ({ config }) => createHttpClient(config.baseUrl),
    })
    .provide({
      postsApi: ({ httpClient }) => createPostsApi(httpClient),
    });

  type Dependencies = dikon.Of<typeof appDikon>;

  expectTypeOf<Dependencies['config']>().toEqualTypeOf<{ readonly baseUrl: string }>();
  expectTypeOf<Dependencies['httpClient']>().toEqualTypeOf<{
    get<T>(path: string): Promise<T>;
  }>();
  expectTypeOf<Dependencies['postsApi']>().toEqualTypeOf<{
    list(): Promise<readonly { id: number; title: string }[]>;
  }>();

  // @ts-expect-error config is required
  appDikon.build();

  const di = appDikon.build({ config: { baseUrl: 'https://api.example.com' } });

  assertType<Promise<readonly { id: number; title: string }[]>>(di.postsApi.list());
});

test('does not add requirements for values that were already provided', () => {
  const di = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://api.test' };
      },
    })
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    })
    .build();

  assertType<string>(di.url);
});

test('types parent containers with dikon methods', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const childDikon = dikon()
    .require<typeof parent>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });
  const child = childDikon.build(undefined, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();

  // @ts-expect-error parent is required when type-only deps are not provided
  childDikon.build();
});

test('keeps local requirements in the first build argument', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const childDikon = dikon()
    .require<typeof parent>()
    .require<{ seed: string }>()
    .provide({
      url({ config, seed }) {
        return `${config.baseUrl}/${seed}`;
      },
    });

  childDikon.build({ seed: 'posts' }, parent);
  childDikon.buildEager({ seed: 'posts' }, parent);

  // @ts-expect-error seed is still required even when a parent is passed
  childDikon.build(undefined, parent);
});

test('types parent containers alongside used dikons', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const urlDikon = dikon()
    .require<{ config: { baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const child = dikon().require<typeof parent>().use(urlDikon).build(undefined, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();
});

test('provided values satisfy requirements', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const appDikon = dikon()
    .require<RootDeps>()
    .require<{ appConfig: { readonly title: string } }>()
    .provide({
      currentUser() {
        return { name: 'Test User' };
      },
      theme() {
        return { name: 'Test Theme' };
      },
      title({ appConfig, currentUser, theme }) {
        return `${appConfig.title}:${currentUser.name}:${theme.name}`;
      },
    });

  const di = appDikon.build({ appConfig: { title: 'Board' } });

  assertType<string>(di.title);
});

test('overridden values satisfy requirements', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const appDikon = dikon()
    .require<RootDeps>()
    .require<{ appConfig: { readonly title: string } }>()
    .override({
      currentUser: () => ({ name: 'Test User' }),
      theme: () => ({ name: 'Test Theme' }),
    })
    .provide({
      title({ appConfig, currentUser, theme }) {
        return `${appConfig.title}:${currentUser.name}:${theme.name}`;
      },
    });

  const di = appDikon.build({ appConfig: { title: 'Board' } });

  assertType<string>(di.title);
});

test('partially overridden values leave other requirements in place', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const appDikon = dikon()
    .require<RootDeps>()
    .override({
      currentUser: () => ({ name: 'Test User' }),
    });

  // @ts-expect-error theme is still required when only currentUser is overridden
  appDikon.build();

  appDikon.build({ theme: { name: 'Test Theme' } });
});

test('bubbles up requirements from a used dikon', () => {
  const httpClientDikon = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const appDikon = dikon().use(httpClientDikon);

  // @ts-expect-error config is required by the used dikon
  appDikon.build();

  const di = appDikon.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.url);
});

test('types service instances contributed by a used dikon', () => {
  const createHttpClient = (baseUrl: string) => ({
    get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
  });

  const httpClientDikon = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      httpClient: ({ config }) => createHttpClient(config.baseUrl),
    });

  const appDikon = dikon().require<{ config: { readonly baseUrl: string } }>().use(httpClientDikon);

  const di = appDikon.build({ config: { baseUrl: 'https://api.example.com' } });

  assertType<Promise<readonly { id: number; title: string }[]>>(
    di.httpClient.get<readonly { id: number; title: string }[]>('/posts'),
  );
});

test('satisfies requirements from earlier dikons without bubbling them up', () => {
  const configDikon = dikon().provide({
    config() {
      return { baseUrl: 'https://api.test' };
    },
  });
  const urlDikon = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const di = dikon().use(configDikon).use(urlDikon).build();

  assertType<string>(di.url);
});

test('lets a used dikon satisfy a previously required service', () => {
  const clockDikon = dikon().provide({
    clock() {
      return { now: () => 0 };
    },
  });

  const appDikon = dikon()
    .require<{ clock: { now(): number } }>()
    .provide({
      time({ clock }) {
        return clock.now();
      },
    })
    .use(clockDikon);

  const di = appDikon.build();

  assertType<number>(di.time);
});

test('restricts overrides to existing services with the existing service type', () => {
  const appDikon = dikon().provide({
    count() {
      return 1;
    },
    label() {
      return 'ready';
    },
  });

  appDikon.override({
    count: () => 2,
    label: ({ count }) => `count:${count}`,
  });

  // @ts-expect-error missing was never provided
  appDikon.override({ missing: () => true });

  appDikon.override({
    // @ts-expect-error count must remain a number
    count: () => 'two',
  });
});
