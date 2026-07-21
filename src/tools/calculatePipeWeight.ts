import { round } from "../utils/formatMoney.js";

export interface WeightInput {
  outerDiameter: number;
  wallThickness: number;
  length: number;
  material: "304" | "316L";
}

export function calculatePipeWeight(input: WeightInput) {
  if (input.wallThickness * 2 >= input.outerDiameter) {
    throw new Error("壁厚必须小于外径的一半。");
  }
  const weightPerMeter = (input.outerDiameter - input.wallThickness) * input.wallThickness * 0.02491;
  return {
    ...input,
    weightPerMeter: round(weightPerMeter, 4),
    totalWeight: round(weightPerMeter * input.length, 4),
    formula: "kg/m = (外径 - 壁厚) × 壁厚 × 0.02491；总重量 = kg/m × 长度",
    remark: "理论重量仅供内部测算，实际重量受公差影响。",
  };
}
