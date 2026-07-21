import { blogArticles } from "./blogStore.js";

export function getBlogArticle(id: string) {
  const article = blogArticles.find((item) => item.id === id);
  if (!article) {
    return { id, matched: false, remark: "未找到文章。" };
  }
  return { matched: true, ...article };
}
