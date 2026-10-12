export function pickDefined<T extends object>(source: T): { [K in keyof T]?: NonNullable<T[K]> } {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) picked[key] = value;
  }
  return picked as { [K in keyof T]?: NonNullable<T[K]> };
}
