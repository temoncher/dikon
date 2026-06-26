import { assertType, test } from 'vitest';

import { dikon } from './dikon';

test('types many standalone dikons that provide dependent services', () => {
  const step001Dikon = dikon().provide({
    step001() {
      return { value: '001' as const };
    },
  });
  const step002Dikon = dikon()
    .require<{ step001: { readonly value: '001' } }>()
    .provide({
      step002({ step001 }) {
        return { value: `${step001.value}.002` as const };
      },
    });
  const step003Dikon = dikon()
    .require<{ step002: { readonly value: '001.002' } }>()
    .provide({
      step003({ step002 }) {
        return { value: `${step002.value}.003` as const };
      },
    });
  const step004Dikon = dikon()
    .require<{ step003: { readonly value: '001.002.003' } }>()
    .provide({
      step004({ step003 }) {
        return { value: `${step003.value}.004` as const };
      },
    });
  const step005Dikon = dikon()
    .require<{ step004: { readonly value: '001.002.003.004' } }>()
    .provide({
      step005({ step004 }) {
        return { value: `${step004.value}.005` as const };
      },
    });
  const step006Dikon = dikon()
    .require<{ step005: { readonly value: '001.002.003.004.005' } }>()
    .provide({
      step006({ step005 }) {
        return { value: `${step005.value}.006` as const };
      },
    });
  const step007Dikon = dikon()
    .require<{ step006: { readonly value: '001.002.003.004.005.006' } }>()
    .provide({
      step007({ step006 }) {
        return { value: `${step006.value}.007` as const };
      },
    });
  const step008Dikon = dikon()
    .require<{ step007: { readonly value: '001.002.003.004.005.006.007' } }>()
    .provide({
      step008({ step007 }) {
        return { value: `${step007.value}.008` as const };
      },
    });
  const step009Dikon = dikon()
    .require<{ step008: { readonly value: '001.002.003.004.005.006.007.008' } }>()
    .provide({
      step009({ step008 }) {
        return { value: `${step008.value}.009` as const };
      },
    });
  const step010Dikon = dikon()
    .require<{
      step009: { readonly value: '001.002.003.004.005.006.007.008.009' };
    }>()
    .provide({
      step010({ step009 }) {
        return { value: `${step009.value}.010` as const };
      },
    });
  const step011Dikon = dikon()
    .require<{
      step010: { readonly value: '001.002.003.004.005.006.007.008.009.010' };
    }>()
    .provide({
      step011({ step010 }) {
        return { value: `${step010.value}.011` as const };
      },
    });
  const step012Dikon = dikon()
    .require<{
      step011: { readonly value: '001.002.003.004.005.006.007.008.009.010.011' };
    }>()
    .provide({
      step012({ step011 }) {
        return { value: `${step011.value}.012` as const };
      },
    });

  const di = dikon()
    .use(step001Dikon)
    .use(step002Dikon)
    .use(step003Dikon)
    .use(step004Dikon)
    .use(step005Dikon)
    .use(step006Dikon)
    .use(step007Dikon)
    .use(step008Dikon)
    .use(step009Dikon)
    .use(step010Dikon)
    .use(step011Dikon)
    .use(step012Dikon)
    .build();

  const expected = '001.002.003.004.005.006.007.008.009.010.011.012' as const;

  assertType<typeof expected>(di.step012.value);
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
