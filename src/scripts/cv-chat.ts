import {
  formatAnswer,
  getChatErrorMessage,
  isSubmittable,
  trimHistory,
  type ChatMessage,
} from "./cv-chat-state";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      size: "normal" | "flexible" | "compact";
      appearance: "always" | "execute" | "interaction-only";
      execution: "render" | "execute";
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    }
  ) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const initializedRoots = new WeakSet<HTMLElement>();
let turnstileScript: Promise<void> | undefined;

async function loadTurnstile(document: Document): Promise<void> {
  if (document.defaultView?.turnstile) return;
  if (!turnstileScript) {
    turnstileScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        turnstileScript = undefined;
        reject(new Error("Turnstile failed to load"));
      };
      document.head.append(script);
    });
  }
  await turnstileScript;
}

function requiredElement<T extends Element>(
  root: HTMLElement,
  selector: string
): T | null {
  return root.querySelector<T>(selector);
}

export function initCvChat(root: HTMLElement): void {
  if (initializedRoots.has(root)) return;
  const form = requiredElement<HTMLFormElement>(root, "[data-cv-form]");
  const input = requiredElement<HTMLTextAreaElement>(root, "[data-cv-input]");
  const submit = requiredElement<HTMLButtonElement>(root, "[data-cv-submit]");
  const transcript = requiredElement<HTMLElement>(root, "[data-cv-transcript]");
  const status = requiredElement<HTMLElement>(root, "[data-cv-status]");
  const turnstileContainer = requiredElement<HTMLElement>(
    root,
    "[data-cv-turnstile]"
  );
  if (
    !form ||
    !input ||
    !submit ||
    !transcript ||
    !status ||
    !turnstileContainer
  )
    return;

  initializedRoots.add(root);
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view) return;
  let history: ChatMessage[] = [];
  let pending = false;
  let widgetId: string | undefined;
  let widgetInitialization: Promise<void> | undefined;
  let tokenResolver: ((token: string) => void) | undefined;
  let tokenRejecter: (() => void) | undefined;

  const setStatus = (message: string) => {
    status.textContent = message;
  };
  const makeTurnstileWidget = async () => {
    try {
      const configResponse = await fetch("/api/cv-config", {
        cache: "no-store",
      });
      if (!configResponse.ok) throw new Error("CV config unavailable");
      const config = (await configResponse.json()) as { siteKey?: unknown };
      if (typeof config.siteKey !== "string" || !config.siteKey) {
        setStatus(
          "The CV assistant is not available yet. Please use the contact links below."
        );
        return;
      }
      await loadTurnstile(document);
      if (!view.turnstile) throw new Error("Turnstile unavailable");
      widgetId = view.turnstile.render(turnstileContainer, {
        sitekey: config.siteKey,
        size: "normal",
        appearance: "interaction-only",
        execution: "execute",
        callback: token => tokenResolver?.(token),
        "error-callback": () => tokenRejecter?.(),
        "expired-callback": () => tokenRejecter?.(),
      });
      root.dataset.cvReady = "true";
      setStatus("");
    } catch {
      setStatus(
        "The verification service could not load. Check your connection and try again."
      );
    }
  };

  const ensureTurnstileWidget = (): Promise<void> => {
    if (widgetId) return Promise.resolve();
    widgetInitialization ??= makeTurnstileWidget().finally(() => {
      widgetInitialization = undefined;
    });
    return widgetInitialization;
  };

  const freshToken = (): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!view.turnstile || !widgetId) {
        reject(new Error("challenge_failed"));
        return;
      }
      tokenResolver = resolve;
      tokenRejecter = () => reject(new Error("challenge_failed"));
      view.turnstile.execute(widgetId);
    });

  const addBubble = (role: "user" | "assistant", content: string) => {
    const article = document.createElement("article");
    article.className =
      role === "user"
        ? "cv-message cv-message-user"
        : "cv-message cv-message-assistant";
    const label = document.createElement("p");
    label.className = "cv-message-label";
    label.textContent = role === "user" ? "You" : "CV assistant";
    const body = document.createElement("p");
    body.className = "cv-message-body";
    body.textContent = content;
    article.append(label, body);
    transcript.append(article);
    return article;
  };

  const send = async () => {
    if (!isSubmittable(input.value, pending)) return;
    const submittedDraft = input.value;
    const question = submittedDraft.trim();
    pending = true;
    submit.disabled = true;
    setStatus("Verifying your question…");
    const slowTimer = view.setTimeout(() => {
      if (pending) setStatus("Still working on your question…");
    }, 8000);
    try {
      await ensureTurnstileWidget();
      if (!widgetId) return;
      const turnstileToken = await freshToken();
      setStatus("Thinking through your question…");
      const nextHistory: ChatMessage[] = [
        ...history,
        { role: "user", content: question },
      ];
      const response = await fetch("/api/cv-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: trimHistory(nextHistory),
          turnstileToken,
        }),
      });
      const payload = (await response.json()) as {
        answer?: unknown;
        sources?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "network"
        );
      }
      if (
        typeof payload.answer !== "string" ||
        !Array.isArray(payload.sources) ||
        !payload.sources.every(source => typeof source === "string")
      ) {
        throw new Error("network");
      }
      const answer = formatAnswer(payload.answer, payload.sources as string[]);
      addBubble("user", question);
      const assistant = addBubble("assistant", answer.text);
      if (answer.sources.length) {
        const sourceList = document.createElement("ul");
        sourceList.className = "cv-source-list";
        for (const source of answer.sources) {
          const item = document.createElement("li");
          item.textContent = source;
          sourceList.append(item);
        }
        assistant.append(sourceList);
      }
      history = [...nextHistory, { role: "assistant", content: answer.text }];
      if (input.value === submittedDraft) input.value = "";
      setStatus("Answer ready.");
    } catch (error) {
      setStatus(
        getChatErrorMessage(error instanceof Error ? error.message : "network")
      );
    } finally {
      view.clearTimeout(slowTimer);
      pending = false;
      submit.disabled = false;
      tokenResolver = undefined;
      tokenRejecter = undefined;
      if (widgetId) view.turnstile?.reset(widgetId);
    }
  };

  form.addEventListener("submit", event => {
    event.preventDefault();
    void send();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  root
    .querySelectorAll<HTMLButtonElement>("[data-cv-example]")
    .forEach(button => {
      button.addEventListener("click", () => {
        input.value =
          button.dataset.question ?? button.textContent?.trim() ?? "";
        input.focus();
      });
    });
  void ensureTurnstileWidget();
}
