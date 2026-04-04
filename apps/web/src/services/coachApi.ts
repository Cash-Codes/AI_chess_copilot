import type { CoachAnalyzeRequest, CoachAnalyzeResponse } from "@ai-chess-copilot/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const TIMEOUT_MS = 15_000;

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
  signal?.addEventListener("abort", () => controller.abort(signal.reason), { once: true });

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
        typeof body?.error === "string" ? body.error : `Request failed (${res.status})`;
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
