import type { CoachAnalyzeRequest, CoachAnalyzeResponse } from "@ai-chess-copilot/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function analyzePosition(
  req: CoachAnalyzeRequest,
): Promise<CoachAnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/coach/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json() as Promise<CoachAnalyzeResponse>;
}
