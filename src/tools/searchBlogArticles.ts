import { scoreText } from "../utils/searchText.js";
import { blogArticles } from "./blogStore.js";

export function searchBlogArticles(keyword: string, limit = 5) {
  const articles = blogArticles
    .map((article) => ({
      article,
      score: scoreText(keyword, [
        article.title,
        article.category,
        ...article.tags,
        article.summary,
        article.content,
      ]),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => ({
      id: article.id,
      title: article.title,
      category: article.category,
      tags: article.tags,
      summary: article.summary,
    }));

  return {
    keyword,
    matchedCount: articles.length,
    articles,
    ...(articles.length === 0
      ? { hint: "可搜索：304、316L、六价铬、气密测试、在线固溶、EPDM、规格表。" }
      : {}),
  };
}
