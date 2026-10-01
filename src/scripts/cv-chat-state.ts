export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type FormattedAnswer = {
  text: string;
  sources: string[];
};

export function formatAnswer(
  answer: string,
  sources: string[]
): FormattedAnswer {
  return { text: answer, sources: [...sources] };
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
