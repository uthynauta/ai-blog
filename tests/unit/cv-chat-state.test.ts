import { describe, expect, it } from "vitest";
import {
	formatAnswer,
	getChatErrorMessage,
	isSubmittable,
	trimHistory,
	type ChatMessage,
} from "../../src/scripts/cv-chat-state";

describe("CV chat presentation and state", () => {
	it("keeps Worker-extracted source titles beside plain answer text", () => {
		expect(
			formatAnswer("Built an evaluation workflow.", ["Selected Work"])
		).toEqual({ text: "Built an evaluation workflow.", sources: ["Selected Work"] });
	});

	it("leaves malformed citation-like text untouched", () => {
		expect(formatAnswer("Literal [[unfinished citation", [])).toEqual({
			text: "Literal [[unfinished citation",
			sources: [],
		});
	});

	it("rejects blank drafts and submissions while a request is pending", () => {
		expect(isSubmittable("  \n", false)).toBe(false);
		expect(isSubmittable("Tell me about the work", true)).toBe(false);
		expect(isSubmittable("Tell me about the work", false)).toBe(true);
	});

	it("sends only the latest eight transcript messages and ends on the user", () => {
		const history: ChatMessage[] = Array.from({ length: 10 }, (_, index) => ({
			role: index === 9 ? "user" : index % 2 ? "assistant" : "user",
			content: `message ${index}`,
		}));

		expect(trimHistory(history)).toEqual(history.slice(2));
	});

	it("maps stable Worker errors to retryable visitor-facing messages", () => {
		expect(getChatErrorMessage("challenge_failed")).toMatch(/verif/i);
		expect(getChatErrorMessage("rate_limited")).toMatch(/wait/i);
		expect(getChatErrorMessage("timeout")).toMatch(/taking longer/i);
		expect(getChatErrorMessage("agent_unavailable")).toMatch(/unavailable/i);
		expect(getChatErrorMessage("invalid_request")).toMatch(/try again/i);
		expect(getChatErrorMessage("network")).toMatch(/connection/i);
	});
});
