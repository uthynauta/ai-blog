export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CvSourceDocument = {
  filename: string;
  url: string;
};

export type CvSource = {
  title: string;
  documents: CvSourceDocument[];
};

export type FormattedAnswer = {
  text: string;
  sources: CvSource[];
};

export function formatAnswer(
  answer: string,
  sources: CvSource[]
): FormattedAnswer {
  return {
    text: answer,
    sources: sources.map(source => ({
      title: source.title,
      documents: source.documents.map(document => ({ ...document })),
    })),
  };
}

function isVerifiedPdfDocument(value: unknown): value is CvSourceDocument {
  if (!value || typeof value !== "object") return false;
  const { filename, url } = value as Record<string, unknown>;
  if (
    typeof filename !== "string" ||
    !filename.trim().toLowerCase().endsWith(".pdf") ||
    typeof url !== "string"
  ) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      /^\/v1\/documents\/[A-Za-z0-9][A-Za-z0-9._-]*\/original$/.test(
        parsed.pathname
      ) &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

export function parseSources(value: unknown): CvSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources: CvSource[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return undefined;
    const { title, documents } = candidate as Record<string, unknown>;
    if (typeof title !== "string" || !Array.isArray(documents)) {
      return undefined;
    }
    sources.push({
      title,
      documents: documents.filter(isVerifiedPdfDocument),
    });
  }
  return sources;
}

export function isSubmittable(draft: string, pending: boolean): boolean {
  return !pending && draft.trim().length > 0;
}

export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-8);
  let total = recent.reduce((sum, message) => sum + message.content.length, 0);
  while (recent.length > 1 && total > 4000) {
    total -= recent.shift()!.content.length;
  }
  return recent;
}

export function getChatErrorMessage(error: string): string {
  switch (error) {
    case "challenge_failed":
      return "We couldn’t verify this request. Please try again.";
    case "rate_limited":
      return "There have been several questions recently. Please wait a moment and try again.";
    case "timeout":
      return "That’s taking longer than expected. Please try again.";
    case "agent_unavailable":
    case "not_configured":
      return "The CV assistant is temporarily unavailable. Please try again later.";
    case "invalid_request":
      return "We couldn’t send that question. Please try again.";
    default:
      return "Check your connection and try again.";
  }
}
