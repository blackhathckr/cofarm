/** Avatar initials: first and last word, so "Rajesh Kumar" reads as RK. */
export function initialsOf(fullName: string): string {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const first = words.at(0)?.charAt(0) ?? '';
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase();
}
