import { fittingSizes, type FittingType } from "../data/fitting-sizes.js";
import { matchPipeSize } from "../utils/matchSize.js";

export function queryFittingSize(keyword: string) {
  const pipe = matchPipeSize(keyword);
  const fittingType = (["弯头", "直接", "三通"] as FittingType[]).find((type) =>
    keyword.includes(type),
  );
  const match = fittingSizes.find(
    (item) => item.dn === pipe?.dn && (!fittingType || item.fittingType === fittingType),
  );
  if (!match) {
    return {
      keyword,
      matched: false as const,
      category: "fitting" as const,
      availableTypes: ["弯头", "直接", "三通"],
      remark: "未匹配到管件，请同时提供已收录的 DN/外径与管件类型。",
    };
  }
  return { keyword, matched: true as const, category: "fitting" as const, ...match };
}
