import { relevantExcerpt, scoreText } from "../utils/searchText.js";
import { shanghanEntries } from "../data/shanghanStore.js";

export function askShanghanKnowledge(question: string, limit = 5) {
  const references = shanghanEntries
    .map((entry) => ({
      entry,
      score: scoreText(question, [
        entry.title,
        entry.type,
        entry.category,
        ...entry.tags,
        entry.summary,
        entry.content,
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
      relevantText: relevantExcerpt(entry.content, question),
    }));

  return {
    question,
    matchedCount: references.length,
    references,
    answerHint:
      references.length > 0
        ? "请基于以上伤寒论知识库资料总结。注意：本系统仅为辅助参考，不替代医师诊断，不提供处方与剂量。"
        : "知识库暂未检索到直接相关内容，建议更换关键词或咨询中医师。",
  };
}
