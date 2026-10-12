/**
 * Project codes are `[REGION][VARIETY][NUMBER]` — MYSBN06 is the sixth banana
 * parcel in the Mysore belt. Every 10-acre parcel gets its own code, including
 * a second parcel at the same location, and the code is what every record in
 * the system hangs off.
 */

const PROJECT_CODE_PATTERN = /^([A-Z]{3})([A-Z]{2})(\d{2,3})$/;

export type ProjectCodeParts = {
  region: string;
  variety: string;
  sequence: number;
};

export function isProjectCode(value: string): boolean {
  return PROJECT_CODE_PATTERN.test(value);
}

export function parseProjectCode(value: string): ProjectCodeParts {
  const match = PROJECT_CODE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Not a project code: ${value}`);
  }
  const [, region, variety, sequence] = match;
  if (region === undefined || variety === undefined || sequence === undefined) {
    throw new Error(`Not a project code: ${value}`);
  }
  return { region, variety, sequence: Number(sequence) };
}

export function buildProjectCode(parts: ProjectCodeParts): string {
  const code = `${parts.region.toUpperCase()}${parts.variety.toUpperCase()}${String(
    parts.sequence,
  ).padStart(2, '0')}`;
  if (!isProjectCode(code)) {
    throw new Error(`Cannot build a project code from ${JSON.stringify(parts)}`);
  }
  return code;
}
