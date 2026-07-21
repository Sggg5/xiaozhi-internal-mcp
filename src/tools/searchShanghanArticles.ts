import { scoreText } from "../utils/searchText.js";
import { shanghanEntries } from "../data/shanghanStore.js";

export function searchShanghanArticles(keyword: string, limit = 10) {
  const results = shanghanEntries
    .map((entry) => ({
      entry,
      score: scoreText(keyword, [
        entry.title,
        entry.type,
        entry.category,
        ...entry.tags,
        entry.summary,
        entry.content.slice(0, 500),
      ]),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      category: entry.category,
      tags: entry.tags,
      summary: entry.summary,
    }));

  return {
    keyword,
    matchedCount: results.length,
    entries: results,
    ...(results.length === 0
      ? { hint: "可搜索伤寒论条文、方剂、药物、证型等关键词。" }
      : {}),
  };
}

export function searchShanghanByType(type: string, keyword: string, limit = 10) {
  const results = shanghanEntries
    .filter((e) => e.type === type)
    .map((entry) => ({
      entry,
      score: scoreText(keyword, [entry.title, ...entry.tags, entry.summary, entry.content.slice(0, 300)]),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({ id: entry.id, title: entry.title, category: entry.category, tags: entry.tags, summary: entry.summary }));

  return { keyword, type, matchedCount: results.length, entries: results };
}
