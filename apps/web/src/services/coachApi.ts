import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
  CoachStreamChunk,
} from "@ai-chess-copilot/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const TIMEOUT_MS = 15_000;

// Non-streaming fetch — kept for tests and backwards compatibility.
export async function analyzePosition(
  req: CoachAnalyzeRequest,
  signal?: AbortSignal,
): Promise<CoachAnalyzeResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort(signal.reason), {
    once: true,
  });

  try {
    const res = await fetch(`${API_BASE}/api/coach/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body?.error === "string"
          ? body.error
          : `Request failed (${res.status})`;
      throw new Error(message);
    }

    return res.json() as Promise<CoachAnalyzeResponse>;
  } catch (err) {
    if (timedOut) throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Streaming fetch — reads NDJSON response and calls onChunk per section.
export function streamAnalysis(
  req: CoachAnalyzeRequest,
  callbacks: {
    onChunk: (chunk: CoachStreamChunk) => void;
    onComplete: () => void;
    onError: (err: Error) => void;
  },
  signal?: AbortSignal,
): void {
  const { onChunk, onComplete, onError } = callbacks;

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/coach/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal,
      });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      onError(err instanceof Error ? err : new Error("Network error"));
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body?.error === "string"
          ? body.error
          : `Request failed (${res.status})`;
      onError(new Error(message));
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as CoachStreamChunk;
            onChunk(chunk);
          } catch {
            // Ignore malformed lines — forward compatibility
          }
        }
      }
      // Flush any remaining buffer content after stream ends
      if (buffer.trim()) {
        try {
          onChunk(JSON.parse(buffer.trim()) as CoachStreamChunk);
        } catch {
          // Ignore
        }
      }
      onComplete();
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      onError(err instanceof Error ? err : new Error("Stream read error"));
    }
  })();
}
