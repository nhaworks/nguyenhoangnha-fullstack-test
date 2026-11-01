import { useEffect, useState } from 'react';

export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isOutdated = false;
    setIsLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (!isOutdated) setData(result);
      })
      .catch((err: Error) => {
        if (!isOutdated) setError(err.message);
      })
      .finally(() => {
        if (!isOutdated) setIsLoading(false);
      });

    return () => {
      isOutdated = true;
    };
  }, [...deps, reloadCount]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  return { data, isLoading, error, reload };
}
