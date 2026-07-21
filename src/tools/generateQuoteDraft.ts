import { internalDisclaimer } from "../data/quote-rules.js";

export function generateQuoteDraft(quoteData: Record<string, unknown>) {
  const amount = quoteData.estimatedTotalAmountRange as
    | { min?: number; max?: number; currency?: string }
    | undefined;
  return {
    title: `内部报价草稿 - ${String(quoteData.dn ?? "待确认规格")}`,
    draftText: [
      `产品规格：${String(quoteData.dn ?? "待确认")}，材质：${String(quoteData.material ?? "待确认")}，壁厚：${String(quoteData.wallThickness ?? "待确认")}mm。`,
      `数量/长度：${String(quoteData.length ?? "待确认")}m，表面处理：${String(quoteData.surface ?? "待确认")}。`,
      amount ? `内部参考总额区间：${amount.min}-${amount.max} ${amount.currency ?? "CNY"}。` : "内部参考总额：待测算。",
      internalDisclaimer,
    ].join("\n"),
    checklist: [
      "材质是否确认",
      "壁厚是否确认",
      "表面处理是否确认",
      "是否含税",
      "是否含运费",
      "是否特殊包装",
      "是否非标定制",
      "是否需要工艺评审",
    ],
  };
}
