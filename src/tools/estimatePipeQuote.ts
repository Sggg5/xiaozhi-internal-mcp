import { internalDisclaimer, quoteRules } from "../data/quote-rules.js";
import { matchPipeSize } from "../utils/matchSize.js";
import { moneyRange, round } from "../utils/formatMoney.js";
import { calculatePipeWeight } from "./calculatePipeWeight.js";

export interface QuoteInput {
  dn: string;
  material: "304" | "316L";
  wallThickness: number;
  length: number;
  surface: "酸洗" | "抛光" | "喷砂" | "定制";
  taxIncluded: boolean;
  customerType?: "普通客户" | "工程客户" | "经销商";
}

export function estimatePipeQuote(input: QuoteInput) {
  const pipe = matchPipeSize(input.dn);
  if (!pipe) throw new Error(`未收录规格：${input.dn}`);
  const customerType = input.customerType ?? "普通客户";
  const weight = calculatePipeWeight({
    outerDiameter: pipe.outerDiameter,
    wallThickness: input.wallThickness,
    length: input.length,
    material: input.material,
  });
  const materialCost = weight.totalWeight * quoteRules.materialPricePerKg[input.material];
  const processingCost = input.length * quoteRules.baseProcessingPerMeter;
  const surfaceCost = input.length * quoteRules.surfacePerMeter[input.surface];
  const packagingCost = input.length * quoteRules.packagingPerMeter;
  const subtotalBeforeLoss = materialCost + processingCost + surfaceCost + packagingCost;
  const subtotalWithLoss = subtotalBeforeLoss * (1 + quoteRules.lossRate);
  const taxFactor = input.taxIncluded ? 1 + quoteRules.taxRate : 1;
  const [lowFactor, highFactor] = quoteRules.customerPriceFactor[customerType];
  const low = subtotalWithLoss * lowFactor * taxFactor;
  const high = subtotalWithLoss * highFactor * taxFactor;

  return {
    dn: pipe.dn,
    outerDiameter: pipe.outerDiameter,
    wallThickness: input.wallThickness,
    material: input.material,
    length: input.length,
    surface: input.surface,
    taxIncluded: input.taxIncluded,
    customerType,
    weightPerMeter: weight.weightPerMeter,
    totalWeight: weight.totalWeight,
    referencePriceRange: moneyRange(low / input.length, high / input.length),
    estimatedTotalAmountRange: moneyRange(low, high),
    costSummary: {
      materialCost: round(materialCost),
      processingAndSurfaceCost: round(processingCost + surfaceCost),
      packagingCost: round(packagingCost),
      lossRate: quoteRules.lossRate,
      taxRateApplied: input.taxIncluded ? quoteRules.taxRate : 0,
      note: "为避免暴露毛利率，仅展示基础测算成本分类。",
    },
    riskWarnings: [
      "材料价格需按当天价格确认",
      "特殊包装、特殊标准、非标尺寸需人工复核",
      "正式报价需人工确认",
    ],
    disclaimer: internalDisclaimer,
  };
}
