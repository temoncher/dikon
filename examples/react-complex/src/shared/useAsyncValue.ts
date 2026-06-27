import { useEffect, useReducer, useState } from 'react';

export interface AsyncState<TValue> {
  readonly error: string | null;
  readonly isFetching: boolean;
  readonly isPending: boolean;
  readonly isRefetching: boolean;
  refresh(): void;
  readonly value: TValue | null;
}

export function useAsyncValue<TValue>(
  load: (options?: { signal: AbortSignal }) => Promise<TValue>,
) {
  const [refreshVersion, refresh] = useReducer((version: number) => version + 1, 0);
  const [state, setState] = useState<AsyncState<TValue>>({
    error: null,
    isFetching: true,
    isPending: true,
    isRefetching: false,
    refresh,
    value: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function update() {
      setState((current) => {
        const hasValue = current.value !== null;

        return {
          error: null,
          isFetching: true,
          isPending: !hasValue,
          isRefetching: hasValue,
          refresh,
          value: current.value,
        };
      });

      try {
        const value = await load({ signal: controller.signal });

        if (!cancelled) {
          setState({
            error: null,
            isFetching: false,
            isPending: false,
            isRefetching: false,
            refresh,
            value,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            error: error instanceof Error ? error.message : 'Request failed',
            isFetching: false,
            isPending: false,
            isRefetching: false,
            refresh,
            value: null,
          });
        }
      }
    }

    void update();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [load, refreshVersion]);

  return state;
}
