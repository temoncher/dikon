import { assertType, expectTypeOf, test } from 'vitest';

import { dikon } from './dikon';

test('types callable dikon builders and plugins', () => {
  const parent = dikon()
    .provide({
      config() {
        return 10;
      },
    })
    .build();
  const plugin = dikon((builder) =>
    builder.require<{ config: number }>().provide({
      fortyTwo(di) {
        return di.config + 32;
      },
    }),
  );

  const child = dikon().require<typeof parent>().pipe(plugin).build({}, parent);

  assertType<number>(child.fortyTwo);
});

test('returns readonly build output', () => {
  const builder = dikon().provide({
    value() {
      return 'ready';
    },
  });

  type Dependencies = dikon.Of<typeof builder>;
  const deps = builder.build();

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
  interface Config {
    readonly baseUrl: string;
  }

  const builder = dikon()
    .require<{ config: Config }>()
    .provide({
      httpClient({ config }) {
        return {
          get(path: string) {
            return `${config.baseUrl}${path}`;
          },
        };
      },
    })
    .provide({
      getPosts({ httpClient }) {
        return () => httpClient.get('/posts');
      },
    });

  type Dependencies = dikon.Of<typeof builder>;

  expectTypeOf<Dependencies['config']>().toEqualTypeOf<Config>();
  expectTypeOf<Dependencies['httpClient']>().toEqualTypeOf<{
    get(path: string): string;
  }>();
  expectTypeOf<Dependencies['getPosts']>().toEqualTypeOf<() => string>();

  // @ts-expect-error config is required
  builder.build();

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.getPosts());
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

test('types parent containers with builder methods', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const childBuilder = dikon()
    .require<typeof parent>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });
  const child = childBuilder.build({}, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();

  // @ts-expect-error parent is required when type-only deps are not provided
  childBuilder.build();
});

test('keeps local requirements in the first build argument', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const childBuilder = dikon()
    .require<typeof parent>()
    .require<{ seed: string }>()
    .provide({
      url({ config, seed }) {
        return `${config.baseUrl}/${seed}`;
      },
    });

  childBuilder.build({ seed: 'posts' }, parent);
  childBuilder.buildEager({ seed: 'posts' }, parent);

  // @ts-expect-error seed is still required even when a parent is passed
  childBuilder.build({}, parent);
});

test('types parent containers with single-callback builder pipes', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const child = dikon()
    .require<typeof parent>()
    .pipe((builder) =>
      builder.provide({
        url({ config }) {
          return `${config.baseUrl}/posts`;
        },
      }),
    )
    .build({}, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();
});

test('provided values satisfy requirements', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const builder = dikon()
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

  const di = builder.build({ appConfig: { title: 'Board' } });

  assertType<string>(di.title);
});

test('overridden values satisfy requirements', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const builder = dikon()
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

  const di = builder.build({ appConfig: { title: 'Board' } });

  assertType<string>(di.title);
});

test('partially overridden values leave other requirements in place', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const builder = dikon()
    .require<RootDeps>()
    .override({
      currentUser: () => ({ name: 'Test User' }),
    });

  // @ts-expect-error theme is still required when only currentUser is overridden
  builder.build();

  builder.build({ theme: { name: 'Test Theme' } });
});

test('types reusable dikon plugins used through builder pipe', () => {
  const withHttpClient = dikon((builder) =>
    builder.require<{ config: { readonly baseUrl: string } }>().provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    }),
  );

  const builder = dikon().pipe(withHttpClient);

  // @ts-expect-error config is required by the plugin
  builder.build();

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.url);
});

test('pipe accepts a single callback', () => {
  const builder = dikon().pipe((current) =>
    current.provide({
      value() {
        return 'ready';
      },
    }),
  );

  assertType<string>(builder.build().value);

  dikon().pipe(
    (current) => current,
    // @ts-expect-error pipe composes one callback, not a list of transforms
    (current: unknown) => current,
  );
});

test('dikon builders keep their type through pipe callbacks', () => {
  const builder = dikon().provide({
    value() {
      return 'ready';
    },
  });

  const dataBuilder: dikon.Dikon<{ value: string }, {}> = builder;
  const di = dataBuilder.pipe((current) => current.build());

  assertType<string>(di.value);
});

test('types pipe callbacks from the current builder', () => {
  interface Config {
    readonly baseUrl: string;
  }

  const builder = dikon()
    .require<{ config: Config }>()
    .pipe((current) =>
      current.provide({
        httpClient({ config }) {
          return {
            get(path: string) {
              return `${config.baseUrl}${path}`;
            },
          };
        },
      }),
    );

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.httpClient.get('/posts'));
});

test('allows pipe callbacks to return arbitrary values', () => {
  const value = dikon()
    .provide({
      service() {
        return 'ready';
      },
    })
    .pipe((current) => current.build().service);

  assertType<string>(value);
});

test('keeps requirements added by a piped builder', () => {
  interface Config {
    readonly baseUrl: string;
  }

  const builder = dikon()
    .pipe((current) => current.require<{ config: Config }>())
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  // @ts-expect-error config is required through the piped builder
  builder.build();

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.url);
});

test('does not add requirements for values that were already provided before pipe', () => {
  const builder = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://api.test' };
      },
    })
    .pipe((current) => current.require<{ config: { readonly baseUrl: string } }>())
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const di = builder.build();

  assertType<string>(di.url);
});

test('restricts overrides to existing services with the existing service type', () => {
  const builder = dikon().provide({
    count() {
      return 1;
    },
    label() {
      return 'ready';
    },
  });

  builder.override({
    count: () => 2,
    label: ({ count }) => `count:${count}`,
  });

  // @ts-expect-error missing was never provided
  builder.override({ missing: () => true });

  builder.override({
    // @ts-expect-error count must remain a number
    count: () => 'two',
  });
});
