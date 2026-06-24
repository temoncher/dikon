import { assertType, expectTypeOf, test } from 'vitest';

import { dikon } from './dikon';
import type { Dikon, Of } from './dikon';

test('infers required and provided dependencies', () => {
  interface Config {
    readonly baseUrl: string;
  }

  const builder = dikon
    .container()
    .requires({ config: dikon.type<Config>() })
    .provide({
      httpClient: ({ config }) => ({
        get(path: string) {
          return `${config.baseUrl}${path}`;
        },
      }),
    })
    .provide({
      getPosts:
        ({ httpClient }) =>
        () =>
          httpClient.get('/posts'),
    });

  type Dependencies = Of<typeof builder>;

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
  const di = dikon
    .container()
    .provide({
      config: () => ({ baseUrl: 'https://api.test' }),
    })
    .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
    .provide({
      url: ({ config }) => `${config.baseUrl}/posts`,
    })
    .build();

  assertType<string>(di.url);
});

test('types parent containers with builder methods', () => {
  const parent = dikon
    .container()
    .provide({
      config: () => ({ baseUrl: 'https://parent.test' }),
    })
    .build();

  const childBuilder = dikon.container<typeof parent>().provide({
    url: ({ config }) => `${config.baseUrl}/posts`,
  });
  const child = childBuilder.build(undefined, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();

  // @ts-expect-error parent container is required when parent deps were declared
  childBuilder.build();
});

test('keeps non-parent requirements in the first build argument', () => {
  const parent = dikon
    .container()
    .provide({
      config: () => ({ baseUrl: 'https://parent.test' }),
    })
    .build();

  const childBuilder = dikon
    .container<typeof parent>()
    .requires({ seed: dikon.type<string>() })
    .provide({
      url: ({ config, seed }) => `${config.baseUrl}/${seed}`,
    });

  childBuilder.build({ seed: 'posts' }, parent);
  childBuilder.buildEager({ seed: 'posts' }, parent);

  // @ts-expect-error seed is still required even when parent is passed
  childBuilder.build(undefined, parent);
});

test('types parent containers with single-callback builder pipes', () => {
  const parent = dikon
    .container()
    .provide({
      config: () => ({ baseUrl: 'https://parent.test' }),
    })
    .build();

  const child = dikon
    .container<typeof parent>()
    .pipe((builder) =>
      builder.provide({
        url: ({ config }) => `${config.baseUrl}/posts`,
      }),
    )
    .build(undefined, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();
});

test('types reusable dikon plugins used through builder pipe', () => {
  const withHttpClient = dikon.plugin((builder) =>
    builder.requires({ config: dikon.type<{ readonly baseUrl: string }>() }).provide({
      url: ({ config }) => `${config.baseUrl}/posts`,
    }),
  );

  const builder = dikon.container().pipe(withHttpClient);

  // @ts-expect-error config is required by the plugin
  builder.build();

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.url);
});

test('pipe accepts a single callback', () => {
  const builder = dikon.container().pipe((current) =>
    current.provide({
      value: () => 'ready',
    }),
  );

  assertType<string>(builder.build().value);

  dikon.container().pipe(
    (current) => current,
    // @ts-expect-error pipe composes one callback, not a list of transforms
    (current: unknown) => current,
  );
});

test('does not expose dikon as a direct pipeline helper', () => {
  const transform = (builder: Dikon<{}, {}, undefined>) =>
    builder.provide({
      value: () => 'ready',
    });

  // @ts-expect-error create a builder with dikon.container(), then pass one transform to .pipe(...)
  dikon(transform, (builder) => builder.build());
});

test('types dikon as a method-capable builder', () => {
  const builder = dikon.container();

  assertType<number>(builder.__layers.length);
  assertType<number>(builder.__requires.length);

  const di = builder
    .provide({
      value: () => 'ready',
    })
    .build();

  assertType<string>(di.value);
});

test('dikon builders keep their type through pipe callbacks', () => {
  const builder = dikon.container().provide({
    value: () => 'ready',
  });

  const dataBuilder: Dikon<{ value: string }, {}, undefined> = builder;
  const di = dataBuilder.pipe((current) => current.build());

  assertType<string>(di.value);
});

test('renames eager build api to camel case', () => {
  const builder = dikon.container().provide({
    value: () => 'ready',
  });

  const di = builder.buildEager();

  assertType<string>(di.value);

  // @ts-expect-error build_eager was renamed to buildEager
  builder.build_eager();
});

test('types pipe callbacks from the current builder', () => {
  interface Config {
    readonly baseUrl: string;
  }

  const builder = dikon
    .container()
    .requires({ config: dikon.type<Config>() })
    .pipe((current) =>
      current.provide({
        httpClient: ({ config }) => ({
          get(path: string) {
            return `${config.baseUrl}${path}`;
          },
        }),
      }),
    );

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.httpClient.get('/posts'));
});

test('allows pipe callbacks to return arbitrary values', () => {
  const value = dikon
    .container()
    .provide({
      service: () => 'ready',
    })
    .pipe((current) => current.build().service);

  assertType<string>(value);
});

test('keeps requirements added by a piped builder', () => {
  interface Config {
    readonly baseUrl: string;
  }

  const builder = dikon
    .container()
    .pipe((current) => current.requires({ config: dikon.type<Config>() }))
    .provide({
      url: ({ config }) => `${config.baseUrl}/posts`,
    });

  // @ts-expect-error config is required through the piped builder
  builder.build();

  const di = builder.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.url);
});

test('does not add requirements for values that were already provided before pipe', () => {
  const builder = dikon
    .container()
    .provide({
      config: () => ({ baseUrl: 'https://api.test' }),
    })
    .pipe((current) => current.requires({ config: dikon.type<{ readonly baseUrl: string }>() }))
    .provide({
      url: ({ config }) => `${config.baseUrl}/posts`,
    });

  const di = builder.build();

  assertType<string>(di.url);
});

test('restricts overrides to existing services with the existing service type', () => {
  const builder = dikon.container().provide({
    count: () => 1,
    label: () => 'ready',
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

test('preserves symbol-keyed dependencies', () => {
  const CONFIG_TOKEN = Symbol('config');
  const SERVICE_TOKEN = Symbol('service');

  const builder = dikon
    .container()
    .requires({ [CONFIG_TOKEN]: dikon.type<{ readonly prefix: string }>() })
    .provide({
      [SERVICE_TOKEN]: ({ [CONFIG_TOKEN]: config }) => `${config.prefix}-service`,
    });

  const di = builder.build({ [CONFIG_TOKEN]: { prefix: 'typed' } });

  assertType<string>(di[SERVICE_TOKEN]);
  // @ts-expect-error symbol-keyed config is required
  builder.build();
});
