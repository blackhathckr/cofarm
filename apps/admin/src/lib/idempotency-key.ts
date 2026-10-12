import { useCallback, useRef } from 'react';

/**
 * One key per submission attempt. A retry after a network failure has to replay
 * rather than act twice, while an edited submission is a different intent.
 */
export function useIdempotencyKey(): (fingerprint: string) => string {
  const held = useRef<{ fingerprint: string; key: string } | null>(null);

  return useCallback((fingerprint: string) => {
    const current = held.current;
    if (current !== null && current.fingerprint === fingerprint) return current.key;

    const key = crypto.randomUUID();
    held.current = { fingerprint, key };
    return key;
  }, []);
}
