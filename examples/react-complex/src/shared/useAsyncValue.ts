import { useEffect, useState } from 'react';

export interface AsyncState<TValue> {
  readonly error: string | null;
  readonly loading: boolean;
  readonly value: TValue | null;
}

export function useAsyncValue<TValue>(load: () => Promise<TValue>): AsyncState<TValue> {
  const [state, setState] = useState<AsyncState<TValue>>({
    error: null,
    loading: true,
    value: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function update() {
      setState({ error: null, loading: true, value: null });

      try {
        const value = await load();

        if (!cancelled) {
          setState({ error: null, loading: false, value });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            error: error instanceof Error ? error.message : 'Request failed',
            loading: false,
            value: null,
          });
        }
      }
    }

    void update();

    return () => {
      cancelled = true;
    };
  }, [load]);

  return state;
}
