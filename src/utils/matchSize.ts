import { pipeSizes, type PipeSize } from "../data/pipe-sizes.js";

export function matchPipeSize(keyword: string): PipeSize | undefined {
  const normalized = keyword.trim().toUpperCase().replace(/\s+/g, "");
  const dnMatch = normalized.match(/DN\s*0*(\d{1,3})/i);
  if (dnMatch) {
    const dn = `DN${Number(dnMatch[1])}`;
    const result = pipeSizes.find((item) => item.dn === dn);
    if (result) return result;
  }

  const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return pipeSizes.find((item) =>
    numbers.some((number) => Math.abs(number - item.outerDiameter) < 0.01),
  );
}
