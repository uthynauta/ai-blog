const CITATION = /\[\[([^\[\]\r\n]+)\]\]/g;

export function extractCitations(answer: string): {
  text: string;
  sources: string[];
} {
  const sources = new Set<string>();
  const text = answer
    .replace(CITATION, (_citation, rawTitle: string) => {
      const title = rawTitle.trim();
      if (!title) return _citation;
      sources.add(title);
      return "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  return { text, sources: [...sources] };
}
