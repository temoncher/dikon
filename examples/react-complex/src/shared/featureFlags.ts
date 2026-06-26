import type { dikon } from '../../../../dikon.ts';

export interface FeatureFlagClient {
  isEnabled(key: string): boolean | undefined;
}

type FlagDefaults = Record<string, boolean>;
type DeclaredFlags<T extends FlagDefaults> = {
  readonly [Key in keyof T]: boolean;
};

interface FeatureFlagsPipeConfig<T extends FlagDefaults> {
  readonly namespace: string;
  readonly flags: T;
}

export function createFeatureFlagClient(overrides: Readonly<Record<string, boolean>> = {}) {
  return {
    isEnabled: (key: string) => overrides[key],
  } satisfies FeatureFlagClient;
}

/**
 * Routes use this pipe function when they want typed feature flags backed by root infra.
 */
export function createFeatureFlagsPipe<const T extends FlagDefaults>(
  config: FeatureFlagsPipeConfig<T>,
) {
  return ((builder) =>
    builder.require<{ featureFlagClient: FeatureFlagClient }>().provide({
      featureFlags({ featureFlagClient }): DeclaredFlags<T> {
        return Object.fromEntries(
          Object.entries(config.flags).map(([key, fallback]) => [
            key,
            featureFlagClient.isEnabled(`${config.namespace}.${key}`) ?? fallback,
          ]),
        ) as DeclaredFlags<T>;
      },
    })) satisfies dikon.PipeFn;
}
