/** Basis points are integers end to end; only the label is a decimal. */
export function formatBasisPoints(basisPoints: number): string {
  const percent = basisPoints / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}
