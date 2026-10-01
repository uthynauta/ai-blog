import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initCvChat } from "../../src/scripts/cv-chat";

function submitEvent(window: Window): Event {
  return new window.Event("submit", {
    bubbles: true,
    cancelable: true,
  }) as unknown as Event;
}

type TestRenderOptions = {
  sitekey: string;
  size: string;
  appearance?: string;
  execution?: string;
  callback: (token: string) => void;
};

describe("CV page and chat controller", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a failed draft and appends the question and answer after success", async () => {
    const window = new Window();
    window.document.body.innerHTML = `
			<section data-cv-chat>
				<div data-cv-transcript></div><p data-cv-status aria-live="polite"></p>
				<form data-cv-form><textarea data-cv-input></textarea><button data-cv-submit>Send</button></form>
				<div data-cv-turnstile></div>
			</section>`;
    const root = window.document.querySelector(
      "[data-cv-chat]"
    ) as unknown as HTMLElement;
    const input = root.querySelector("[data-cv-input]") as HTMLTextAreaElement;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ siteKey: "public" }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(
        Response.json({
          answer: "Built reliable services.",
          sources: [
            {
              title: "**Selected Work** & <img src=x onerror=alert(1)>",
              documents: [
                {
                  filename: "portfolio <final>.pdf",
                  url: "https://cv-agent.example/v1/documents/doc_123/original",
                },
                {
                  filename: "unsafe.pdf",
                  url: "javascript:alert(1)",
                },
              ],
            },
            { title: "Education \\textit{Selected Work}", documents: [] },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
    let turnstileCallback: ((token: string) => void) | undefined;
    (window as unknown as { turnstile: object }).turnstile = {
      render: (
        _container: HTMLElement,
        options: { callback: (token: string) => void }
      ) => {
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
    expect(root.querySelector("[data-cv-status]")?.textContent).toMatch(
      /connection/i
    );

    root.querySelector("[data-cv-form]")?.dispatchEvent(submitEvent(window));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(input.value).toBe("");
    expect(root.querySelector("[data-cv-transcript]")?.textContent).toContain(
      "What did you build?"
    );
    expect(root.querySelector("[data-cv-transcript]")?.textContent).toContain(
      "Built reliable services."
    );
    const transcript = root.querySelector("[data-cv-transcript]")!;
    expect(transcript.textContent).toContain(
      "**Selected Work** & <img src=x onerror=alert(1)>"
    );
    expect(transcript.querySelector("img")).toBeNull();
    expect(transcript.querySelectorAll("a")).toHaveLength(1);
    const pdfLink = transcript.querySelector("a")!;
    expect(pdfLink.textContent).toBe("portfolio <final>.pdf");
    expect(pdfLink.getAttribute("href")).toBe(
      "https://cv-agent.example/v1/documents/doc_123/original"
    );
    expect(pdfLink.getAttribute("target")).toBe("_blank");
    expect(pdfLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(transcript.textContent).toContain("Education \\textit{Selected Work}");
    expect(transcript.textContent).not.toMatch(/,\s*(?:$|Education)/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
    window.happyDOM.abort();
  });

  it("prevents a second submit while the first request is pending", async () => {
    const window = new Window();
    window.document.body.innerHTML = `<section data-cv-chat><div data-cv-transcript></div><p data-cv-status></p><form data-cv-form><textarea data-cv-input>Question</textarea><button data-cv-submit>Send</button></form><div data-cv-turnstile></div></section>`;
    const root = window.document.querySelector(
      "[data-cv-chat]"
    ) as unknown as HTMLElement;
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ siteKey: "public" }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>(resolve => {
            resolveRequest = resolve;
          })
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
    let turnstileCallback: ((token: string) => void) | undefined;
    (window as unknown as { turnstile: object }).turnstile = {
      render: (
        _container: HTMLElement,
        options: { callback: (token: string) => void }
      ) => {
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

  it("defers managed Turnstile execution and sends its fresh token per question", async () => {
    const window = new Window();
    window.document.body.innerHTML = `<section data-cv-chat><div data-cv-transcript></div><p data-cv-status></p><form data-cv-form><textarea data-cv-input>First question</textarea><button data-cv-submit>Send</button></form><div data-cv-turnstile></div></section>`;
    const root = window.document.querySelector(
      "[data-cv-chat]"
    ) as unknown as HTMLElement;
    const container = root.querySelector("[data-cv-turnstile]") as HTMLElement;
    const input = root.querySelector("[data-cv-input]") as HTMLTextAreaElement;
    let renderOptions: TestRenderOptions | undefined;
    let executeCount = 0;
    const tokenQueue = ["fresh-token-one", "fresh-token-two"];
    const turnstile = {
      render: (_container: HTMLElement, options: TestRenderOptions) => {
        renderOptions = options;
        return "widget";
      },
      execute: () => {
        executeCount += 1;
        renderOptions?.callback(tokenQueue.shift()!);
      },
      reset: () => undefined,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ siteKey: "public" }))
      .mockResolvedValueOnce(
        Response.json({ answer: "First answer", sources: [] })
      )
      .mockResolvedValueOnce(
        Response.json({ answer: "Second answer", sources: [] })
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
    (window as unknown as { turnstile: typeof turnstile }).turnstile =
      turnstile;

    initCvChat(root);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(renderOptions).toMatchObject({
      sitekey: "public",
      size: "normal",
      appearance: "interaction-only",
      execution: "execute",
    });
    expect(container.classList.contains("hidden")).toBe(false);
    expect(container.getAttribute("aria-hidden")).not.toBe("true");
    expect(executeCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const form = root.querySelector("[data-cv-form]")!;
    form.dispatchEvent(submitEvent(window));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executeCount).toBe(1);
    expect(
      JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).turnstileToken
    ).toBe("fresh-token-one");

    input.value = "Second question";
    form.dispatchEvent(submitEvent(window));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executeCount).toBe(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).turnstileToken
    ).toBe("fresh-token-two");
    window.happyDOM.abort();
  });
});
