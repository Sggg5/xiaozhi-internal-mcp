export function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, "");
}

export function scoreText(query: string, fields: string[]): number {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery
    .split(/[，,。；;！？!?、]/)
    .filter(Boolean);
  const haystack = normalizeSearchText(fields.join(" "));
  const directScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 2 : 0), 0);
  const fieldScore = fields.reduce((score, field) => {
    const normalizedField = normalizeSearchText(field);
    return score + (normalizedField.length >= 2 && normalizedQuery.includes(normalizedField) ? 1 : 0);
  }, 0);
  return directScore + fieldScore;
}

export function relevantExcerpt(content: string, query: string, maxLength = 800): string {
  if (content.length <= maxLength) return content;
  const terms = normalizeSearchText(query).split(/[，,。；;！？!?、]/).filter(Boolean);
  const normalized = normalizeSearchText(content);
  const position = Math.max(0, ...terms.map((term) => normalized.indexOf(term)));
  const start = Math.max(0, position - Math.floor(maxLength / 3));
  return content.slice(start, start + maxLength);
}
