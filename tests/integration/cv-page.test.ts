import { Window } from "happy-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initCvChat } from "../../src/scripts/cv-chat";

function submitEvent(window: Window): Event {
	return new window.Event("submit", { bubbles: true, cancelable: true }) as unknown as Event;
}

const origin = "http://127.0.0.1:4327";

async function waitForPage(): Promise<Response> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		try {
			return await fetch(`${origin}/cv`);
		} catch {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}
	throw new Error("Astro dev server did not start for the /cv integration test");
}

describe("CV page and chat controller", () => {
	beforeAll(async () => {
		const { spawnSync } = await import("node:child_process");
		spawnSync("node_modules/.bin/astro", ["dev", "--background", "--host", "127.0.0.1", "--port", "4327"], {
			cwd: process.cwd(),
			stdio: "ignore",
		});
		await waitForPage();
	}, 30_000);

	afterAll(async () => {
		const { spawnSync } = await import("node:child_process");
		spawnSync("node_modules/.bin/astro", ["dev", "stop"], { cwd: process.cwd(), stdio: "ignore" });
	});

	afterEach(() => vi.unstubAllGlobals());

	it("renders the CV route, navigation item, disclosure, and contact destination", async () => {
		const response = await fetch(`${origin}/cv`);
		expect(response.status).toBe(200);
		const window = new Window();
		window.document.body.innerHTML = await response.text();
		const document = window.document;

		expect(document.querySelector("main h1")?.textContent).toMatch(/work/i);
		expect(document.querySelector('nav a[href^="/cv"]')?.textContent).toMatch(/cv/i);
		expect(document.querySelector("[data-cv-chat] [data-cv-form]")).not.toBeNull();
		expect(document.querySelector("[data-cv-disclosure]")?.textContent).toMatch(/AI-generated/i);
		expect(document.querySelector('a[href*="linkedin.com"]')).not.toBeNull();
		window.happyDOM.abort();
	});

	it("keeps a failed draft and appends the question and answer after success", async () => {
		const window = new Window();
		window.document.body.innerHTML = `
			<section data-cv-chat>
				<div data-cv-transcript></div><p data-cv-status aria-live="polite"></p>
				<form data-cv-form><textarea data-cv-input></textarea><button data-cv-submit>Send</button></form>
				<div data-cv-turnstile></div>
			</section>`;
		const root = window.document.querySelector("[data-cv-chat]") as unknown as HTMLElement;
		const input = root.querySelector("[data-cv-input]") as HTMLTextAreaElement;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(Response.json({ siteKey: "public" }))
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce(Response.json({ answer: "Built reliable services.", sources: ["Selected Work"] }));
		vi.stubGlobal("fetch", fetchMock);
		vi.stubGlobal("window", window);
		vi.stubGlobal("document", window.document);
		let turnstileCallback: ((token: string) => void) | undefined;
		(window as unknown as { turnstile: object }).turnstile = {
			render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
				turnstileCallback = options.callback;
				return "widget";
			},
			execute: () => turnstileCallback?.("fresh-token"),
			reset: () => undefined,
		};

		initCvChat(root);
		await new Promise(resolve => setTimeout(resolve, 0));
		input.value = "What did you build?";
		root.querySelector("[data-cv-form]")?.dispatchEvent(submitEvent(window));
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(input.value).toBe("What did you build?");
		expect(root.querySelector("[data-cv-status]")?.textContent).toMatch(/connection/i);

		root.querySelector("[data-cv-form]")?.dispatchEvent(submitEvent(window));
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(input.value).toBe("");
		expect(root.querySelector("[data-cv-transcript]")?.textContent).toContain("What did you build?");
		expect(root.querySelector("[data-cv-transcript]")?.textContent).toContain("Built reliable services.");
		expect(root.querySelector("[data-cv-transcript]")?.textContent).toContain("Selected Work");
		expect(fetchMock).toHaveBeenCalledTimes(3);
		vi.unstubAllGlobals();
		window.happyDOM.abort();
	});

	it("prevents a second submit while the first request is pending", async () => {
		const window = new Window();
		window.document.body.innerHTML = `<section data-cv-chat><div data-cv-transcript></div><p data-cv-status></p><form data-cv-form><textarea data-cv-input>Question</textarea><button data-cv-submit>Send</button></form><div data-cv-turnstile></div></section>`;
		const root = window.document.querySelector("[data-cv-chat]") as unknown as HTMLElement;
		let resolveRequest!: (response: Response) => void;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(Response.json({ siteKey: "public" }))
			.mockImplementationOnce(() => new Promise<Response>(resolve => { resolveRequest = resolve; }));
		vi.stubGlobal("fetch", fetchMock);
		vi.stubGlobal("window", window);
		vi.stubGlobal("document", window.document);
		let turnstileCallback: ((token: string) => void) | undefined;
		(window as unknown as { turnstile: object }).turnstile = {
			render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
				turnstileCallback = options.callback;
				return "widget";
			},
			execute: () => turnstileCallback?.("token"),
			reset: () => undefined,
		};
		initCvChat(root);
		await new Promise(resolve => setTimeout(resolve, 20));
		const form = root.querySelector("[data-cv-form]")!;
		form.dispatchEvent(submitEvent(window));
		await new Promise(resolve => setTimeout(resolve, 0));
		form.dispatchEvent(submitEvent(window));
		expect(fetchMock).toHaveBeenCalledTimes(2);
		resolveRequest(Response.json({ answer: "Done", sources: [] }));
		await new Promise(resolve => setTimeout(resolve, 0));
		window.happyDOM.abort();
	});
});
