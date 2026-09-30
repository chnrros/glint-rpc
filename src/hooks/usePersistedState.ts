import { useCallback, useEffect, useState } from "react";
import { loadValue, saveValue } from "../lib/store";

/** State that's loaded from and written back to the local store file. */
export function usePersistedState<T>(key: string, fallback: T): [T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadValue(key, fallback).then((stored) => {
      if (!cancelled) {
        setValue(stored);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback is only used for the initial load
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      void saveValue(key, next);
    },
    [key],
  );

  return [value, update, loaded];
}
