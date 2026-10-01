const CITATION = /\[\[([^\[\]\r\n]*)\]\]/g;
const SOURCE_LABEL = /^\s*(?:sources|fuentes)\s*:/i;

export function extractCitations(answer: string): {
  text: string;
  sources: string[];
} {
  const lines = answer.trimEnd().split("\n");
  const finalLine = lines.at(-1) ?? "";
  const sources = new Set<string>();
  let finalLineCitations = "";
  const sourceLabel = SOURCE_LABEL.exec(finalLine);
  const citationList = sourceLabel
    ? finalLine.slice(sourceLabel[0].length)
    : "";
  if (sourceLabel && /^[\s,]*$/.test(citationList.replace(CITATION, ""))) {
    finalLineCitations = citationList;
    lines.pop();
  }
  const text = lines
    .join("\n")
    .replace(CITATION, (_citation, rawTitle: string) => {
      const title = rawTitle.trim();
      if (title) sources.add(title);
      return "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
  for (const match of finalLineCitations.matchAll(CITATION)) {
    const title = match[1].trim();
    if (title) sources.add(title);
  }

  return { text, sources: [...sources] };
}
