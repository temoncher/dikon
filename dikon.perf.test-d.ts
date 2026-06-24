import { assertType, test } from 'vitest';

import { dikon } from './dikon';

test('types many plugins that provide dependent services', () => {
  const withPlugin001 = dikon.plugin((builder) =>
    builder.provide({ plugin001: () => ({ value: '001' as const }) }),
  );
  const withPlugin002 = dikon.plugin((builder) =>
    builder.requires({ plugin001: dikon.type<{ readonly value: '001' }>() }).provide({
      plugin002: ({ plugin001 }) => ({ value: `${plugin001.value}.002` as const }),
    }),
  );
  const withPlugin003 = dikon.plugin((builder) =>
    builder.requires({ plugin002: dikon.type<{ readonly value: '001.002' }>() }).provide({
      plugin003: ({ plugin002 }) => ({ value: `${plugin002.value}.003` as const }),
    }),
  );
  const withPlugin004 = dikon.plugin((builder) =>
    builder.requires({ plugin003: dikon.type<{ readonly value: '001.002.003' }>() }).provide({
      plugin004: ({ plugin003 }) => ({ value: `${plugin003.value}.004` as const }),
    }),
  );
  const withPlugin005 = dikon.plugin((builder) =>
    builder.requires({ plugin004: dikon.type<{ readonly value: '001.002.003.004' }>() }).provide({
      plugin005: ({ plugin004 }) => ({ value: `${plugin004.value}.005` as const }),
    }),
  );
  const withPlugin006 = dikon.plugin((builder) =>
    builder
      .requires({ plugin005: dikon.type<{ readonly value: '001.002.003.004.005' }>() })
      .provide({
        plugin006: ({ plugin005 }) => ({ value: `${plugin005.value}.006` as const }),
      }),
  );
  const withPlugin007 = dikon.plugin((builder) =>
    builder
      .requires({ plugin006: dikon.type<{ readonly value: '001.002.003.004.005.006' }>() })
      .provide({
        plugin007: ({ plugin006 }) => ({ value: `${plugin006.value}.007` as const }),
      }),
  );
  const withPlugin008 = dikon.plugin((builder) =>
    builder
      .requires({
        plugin007: dikon.type<{ readonly value: '001.002.003.004.005.006.007' }>(),
      })
      .provide({
        plugin008: ({ plugin007 }) => ({ value: `${plugin007.value}.008` as const }),
      }),
  );
  const withPlugin009 = dikon.plugin((builder) =>
    builder
      .requires({
        plugin008: dikon.type<{ readonly value: '001.002.003.004.005.006.007.008' }>(),
      })
      .provide({
        plugin009: ({ plugin008 }) => ({ value: `${plugin008.value}.009` as const }),
      }),
  );
  const withPlugin010 = dikon.plugin((builder) =>
    builder
      .requires({
        plugin009: dikon.type<{
          readonly value: '001.002.003.004.005.006.007.008.009';
        }>(),
      })
      .provide({
        plugin010: ({ plugin009 }) => ({ value: `${plugin009.value}.010` as const }),
      }),
  );
  const withPlugin011 = dikon.plugin((builder) =>
    builder
      .requires({
        plugin010: dikon.type<{
          readonly value: '001.002.003.004.005.006.007.008.009.010';
        }>(),
      })
      .provide({
        plugin011: ({ plugin010 }) => ({ value: `${plugin010.value}.011` as const }),
      }),
  );
  const withPlugin012 = dikon.plugin((builder) =>
    builder
      .requires({
        plugin011: dikon.type<{
          readonly value: '001.002.003.004.005.006.007.008.009.010.011';
        }>(),
      })
      .provide({
        plugin012: ({ plugin011 }) => ({ value: `${plugin011.value}.012` as const }),
      }),
  );

  const di = dikon
    .container()
    .pipe(withPlugin001)
    .pipe(withPlugin002)
    .pipe(withPlugin003)
    .pipe(withPlugin004)
    .pipe(withPlugin005)
    .pipe(withPlugin006)
    .pipe(withPlugin007)
    .pipe(withPlugin008)
    .pipe(withPlugin009)
    .pipe(withPlugin010)
    .pipe(withPlugin011)
    .pipe(withPlugin012)
    .build();

  const expected = '001.002.003.004.005.006.007.008.009.010.011.012' as const;

  assertType<typeof expected>(di.plugin012.value);
});

test('types long dependent provide chains without excessive instantiation depth', () => {
  const di = dikon
    .container()
    .provide({ dep0001: () => ({ value: '0001' as const }) })
    .provide({ dep0002: ({ dep0001 }) => ({ value: `${dep0001.value}.0002` as const }) })
    .provide({ dep0003: ({ dep0002 }) => ({ value: `${dep0002.value}.0003` as const }) })
    .provide({ dep0004: ({ dep0003 }) => ({ value: `${dep0003.value}.0004` as const }) })
    .provide({ dep0005: ({ dep0004 }) => ({ value: `${dep0004.value}.0005` as const }) })
    .provide({ dep0006: ({ dep0005 }) => ({ value: `${dep0005.value}.0006` as const }) })
    .provide({ dep0007: ({ dep0006 }) => ({ value: `${dep0006.value}.0007` as const }) })
    .provide({ dep0008: ({ dep0007 }) => ({ value: `${dep0007.value}.0008` as const }) })
    .provide({ dep0009: ({ dep0008 }) => ({ value: `${dep0008.value}.0009` as const }) })
    .provide({ dep0010: ({ dep0009 }) => ({ value: `${dep0009.value}.0010` as const }) })
    .provide({ dep0011: ({ dep0010 }) => ({ value: `${dep0010.value}.0011` as const }) })
    .provide({ dep0012: ({ dep0011 }) => ({ value: `${dep0011.value}.0012` as const }) })
    .provide({ dep0013: ({ dep0012 }) => ({ value: `${dep0012.value}.0013` as const }) })
    .provide({ dep0014: ({ dep0013 }) => ({ value: `${dep0013.value}.0014` as const }) })
    .provide({ dep0015: ({ dep0014 }) => ({ value: `${dep0014.value}.0015` as const }) })
    .provide({ dep0016: ({ dep0015 }) => ({ value: `${dep0015.value}.0016` as const }) })
    .build();

  const expected =
    '0001.0002.0003.0004.0005.0006.0007.0008.0009.0010.0011.0012.0013.0014.0015.0016' as const;

  assertType<typeof expected>(di.dep0016.value);
});

test('types dependent provide chains with multiple keys per layer', () => {
  const di = dikon
    .container()
    .provide({
      dep0001: () => ({ value: '0001' as const }),
      dep0002: () => ({ value: '0002' as const }),
      dep0003: () => ({ value: '0003' as const }),
    })
    .provide({
      dep0004: ({ dep0003 }) => ({ value: `${dep0003.value}.0004` as const }),
      dep0005: ({ dep0003 }) => ({ value: `${dep0003.value}.0005` as const }),
      dep0006: ({ dep0003 }) => ({ value: `${dep0003.value}.0006` as const }),
    })
    .provide({
      dep0007: ({ dep0006 }) => ({ value: `${dep0006.value}.0007` as const }),
      dep0008: ({ dep0006 }) => ({ value: `${dep0006.value}.0008` as const }),
      dep0009: ({ dep0006 }) => ({ value: `${dep0006.value}.0009` as const }),
    })
    .provide({
      dep0010: ({ dep0009 }) => ({ value: `${dep0009.value}.0010` as const }),
      dep0011: ({ dep0009 }) => ({ value: `${dep0009.value}.0011` as const }),
      dep0012: ({ dep0009 }) => ({ value: `${dep0009.value}.0012` as const }),
    })
    .build();

  const expected = '0003.0006.0009.0012' as const;

  assertType<typeof expected>(di.dep0012.value);
});
