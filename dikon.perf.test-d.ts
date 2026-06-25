import { assertType, test } from 'vitest';

import { dikon } from './dikon';

test('types many plugins that provide dependent services', () => {
  const withPlugin001 = dikon((builder) =>
    builder.provide({
      plugin001() {
        return { value: '001' as const };
      },
    }),
  );
  const withPlugin002 = dikon((builder) =>
    builder.require<{ plugin001: { readonly value: '001' } }>().provide({
      plugin002({ plugin001 }) {
        return { value: `${plugin001.value}.002` as const };
      },
    }),
  );
  const withPlugin003 = dikon((builder) =>
    builder.require<{ plugin002: { readonly value: '001.002' } }>().provide({
      plugin003({ plugin002 }) {
        return { value: `${plugin002.value}.003` as const };
      },
    }),
  );
  const withPlugin004 = dikon((builder) =>
    builder.require<{ plugin003: { readonly value: '001.002.003' } }>().provide({
      plugin004({ plugin003 }) {
        return { value: `${plugin003.value}.004` as const };
      },
    }),
  );
  const withPlugin005 = dikon((builder) =>
    builder.require<{ plugin004: { readonly value: '001.002.003.004' } }>().provide({
      plugin005({ plugin004 }) {
        return { value: `${plugin004.value}.005` as const };
      },
    }),
  );
  const withPlugin006 = dikon((builder) =>
    builder.require<{ plugin005: { readonly value: '001.002.003.004.005' } }>().provide({
      plugin006({ plugin005 }) {
        return { value: `${plugin005.value}.006` as const };
      },
    }),
  );
  const withPlugin007 = dikon((builder) =>
    builder.require<{ plugin006: { readonly value: '001.002.003.004.005.006' } }>().provide({
      plugin007({ plugin006 }) {
        return { value: `${plugin006.value}.007` as const };
      },
    }),
  );
  const withPlugin008 = dikon((builder) =>
    builder.require<{ plugin007: { readonly value: '001.002.003.004.005.006.007' } }>().provide({
      plugin008({ plugin007 }) {
        return { value: `${plugin007.value}.008` as const };
      },
    }),
  );
  const withPlugin009 = dikon((builder) =>
    builder
      .require<{ plugin008: { readonly value: '001.002.003.004.005.006.007.008' } }>()
      .provide({
        plugin009({ plugin008 }) {
          return { value: `${plugin008.value}.009` as const };
        },
      }),
  );
  const withPlugin010 = dikon((builder) =>
    builder
      .require<{
        plugin009: { readonly value: '001.002.003.004.005.006.007.008.009' };
      }>()
      .provide({
        plugin010({ plugin009 }) {
          return { value: `${plugin009.value}.010` as const };
        },
      }),
  );
  const withPlugin011 = dikon((builder) =>
    builder
      .require<{
        plugin010: { readonly value: '001.002.003.004.005.006.007.008.009.010' };
      }>()
      .provide({
        plugin011({ plugin010 }) {
          return { value: `${plugin010.value}.011` as const };
        },
      }),
  );
  const withPlugin012 = dikon((builder) =>
    builder
      .require<{
        plugin011: { readonly value: '001.002.003.004.005.006.007.008.009.010.011' };
      }>()
      .provide({
        plugin012({ plugin011 }) {
          return { value: `${plugin011.value}.012` as const };
        },
      }),
  );

  const di = dikon()
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
  const di = dikon()
    .provide({
      dep0001() {
        return { value: '0001' as const };
      },
    })
    .provide({
      dep0002({ dep0001 }) {
        return { value: `${dep0001.value}.0002` as const };
      },
    })
    .provide({
      dep0003({ dep0002 }) {
        return { value: `${dep0002.value}.0003` as const };
      },
    })
    .provide({
      dep0004({ dep0003 }) {
        return { value: `${dep0003.value}.0004` as const };
      },
    })
    .provide({
      dep0005({ dep0004 }) {
        return { value: `${dep0004.value}.0005` as const };
      },
    })
    .provide({
      dep0006({ dep0005 }) {
        return { value: `${dep0005.value}.0006` as const };
      },
    })
    .provide({
      dep0007({ dep0006 }) {
        return { value: `${dep0006.value}.0007` as const };
      },
    })
    .provide({
      dep0008({ dep0007 }) {
        return { value: `${dep0007.value}.0008` as const };
      },
    })
    .provide({
      dep0009({ dep0008 }) {
        return { value: `${dep0008.value}.0009` as const };
      },
    })
    .provide({
      dep0010({ dep0009 }) {
        return { value: `${dep0009.value}.0010` as const };
      },
    })
    .provide({
      dep0011({ dep0010 }) {
        return { value: `${dep0010.value}.0011` as const };
      },
    })
    .provide({
      dep0012({ dep0011 }) {
        return { value: `${dep0011.value}.0012` as const };
      },
    })
    .provide({
      dep0013({ dep0012 }) {
        return { value: `${dep0012.value}.0013` as const };
      },
    })
    .provide({
      dep0014({ dep0013 }) {
        return { value: `${dep0013.value}.0014` as const };
      },
    })
    .provide({
      dep0015({ dep0014 }) {
        return { value: `${dep0014.value}.0015` as const };
      },
    })
    .provide({
      dep0016({ dep0015 }) {
        return { value: `${dep0015.value}.0016` as const };
      },
    })
    .build();

  const expected =
    '0001.0002.0003.0004.0005.0006.0007.0008.0009.0010.0011.0012.0013.0014.0015.0016' as const;

  assertType<typeof expected>(di.dep0016.value);
});

test('types dependent provide chains with multiple keys per layer', () => {
  const di = dikon()
    .provide({
      dep0001() {
        return { value: '0001' as const };
      },
      dep0002() {
        return { value: '0002' as const };
      },
      dep0003() {
        return { value: '0003' as const };
      },
    })
    .provide({
      dep0004({ dep0003 }) {
        return { value: `${dep0003.value}.0004` as const };
      },
      dep0005({ dep0003 }) {
        return { value: `${dep0003.value}.0005` as const };
      },
      dep0006({ dep0003 }) {
        return { value: `${dep0003.value}.0006` as const };
      },
    })
    .provide({
      dep0007({ dep0006 }) {
        return { value: `${dep0006.value}.0007` as const };
      },
      dep0008({ dep0006 }) {
        return { value: `${dep0006.value}.0008` as const };
      },
      dep0009({ dep0006 }) {
        return { value: `${dep0006.value}.0009` as const };
      },
    })
    .provide({
      dep0010({ dep0009 }) {
        return { value: `${dep0009.value}.0010` as const };
      },
      dep0011({ dep0009 }) {
        return { value: `${dep0009.value}.0011` as const };
      },
      dep0012({ dep0009 }) {
        return { value: `${dep0009.value}.0012` as const };
      },
    })
    .build();

  const expected = '0003.0006.0009.0012' as const;

  assertType<typeof expected>(di.dep0012.value);
});
