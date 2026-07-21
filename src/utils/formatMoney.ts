export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function moneyRange(low: number, high: number): { min: number; max: number; currency: "CNY" } {
  return { min: round(low), max: round(high), currency: "CNY" };
}
