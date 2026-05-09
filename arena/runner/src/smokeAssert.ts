export function expectCondition(
  name: string,
  condition: boolean,
  details: unknown,
): void {
  if (!condition) {
    throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  }
}

export function expectJsonEqual(
  name: string,
  actual: unknown,
  expected: unknown,
): void {
  expectCondition(name, JSON.stringify(actual) === JSON.stringify(expected), {
    expected,
    actual,
  });
}

export function expectNonEmptyString(name: string, value: unknown): void {
  expectCondition(name, typeof value === "string" && value.length > 0, {
    value,
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
