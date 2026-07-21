import defaultShanghanData from "./shanghan-data.json" with { type: "json" };

export interface ShanghanEntry {
  id: string;
  type: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export const shanghanEntries: ShanghanEntry[] = defaultShanghanData as ShanghanEntry[];
