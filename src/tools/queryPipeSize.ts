import { pipeSizes } from "../data/pipe-sizes.js";
import { matchPipeSize } from "../utils/matchSize.js";

export function queryPipeSize(keyword: string) {
  const match = matchPipeSize(keyword);
  if (!match) {
    return {
      keyword,
      matched: false as const,
      category: "pipe" as const,
      availableRange: pipeSizes.map((item) => item.dn),
      remark: "未匹配到规格，可查询 DN15-DN100 或已收录的外径。",
    };
  }
  return { keyword, matched: true as const, category: "pipe" as const, ...match };
}
