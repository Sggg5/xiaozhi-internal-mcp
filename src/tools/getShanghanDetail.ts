import { shanghanEntries } from "../data/shanghanStore.js";

export function getShanghanDetail(id: string) {
  const entry = shanghanEntries.find((e) => e.id === id);

  if (!entry) {
    return {
      error: "not_found",
      message: `未找到 ID 为 "${id}" 的条目。`,
    };
  }

  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    category: entry.category,
    tags: entry.tags,
    summary: entry.summary,
    content: entry.content,
    frontmatter: entry.frontmatter,
  };
}
