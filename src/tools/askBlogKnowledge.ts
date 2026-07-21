import { relevantExcerpt, scoreText } from "../utils/searchText.js";
import { blogArticles } from "./blogStore.js";

export function askBlogKnowledge(question: string, limit = 3) {
  const references = blogArticles
    .map((article) => ({
      article,
      score: scoreText(question, [article.title, ...article.tags, article.summary, article.content]),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => ({
      id: article.id,
      title: article.title,
      relevantText: relevantExcerpt(article.content, question),
      tags: article.tags,
    }));

  return {
    question,
    matchedCount: references.length,
    references,
    answerHint:
      references.length > 0
        ? "请基于以上内部资料总结，并提醒用户以适用标准和人工审核结果为准。"
        : "知识库暂未检索到直接相关内容，建议更换关键词或转人工确认。",
  };
}
