/** A percentage is derived from the paise, never used to compute them. */
export function shareOfPool(sharePaise: string, poolPaise: string): string {
  const pool = BigInt(poolPaise);
  if (pool === 0n) return '—';
  const basisPoints = (BigInt(sharePaise) * 10_000n) / pool;
  return formatBasisPoints(Number(basisPoints));
}

export function formatBasisPoints(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}
