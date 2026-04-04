import { useState } from "react";
import type { CoachAnalyzeResponse, CoachingMode } from "@ai-chess-copilot/shared";

type CoachStatus = "idle" | "loading" | "success" | "error";

const MOCK_RESPONSE: CoachAnalyzeResponse = {
  recommendedMove: "Nf3",
  alternativeMoves: ["Bc4", "d4"],
  summary:
    "Develop a knight toward the center while keeping all options open for the middlegame.",
  reasoning: [
    "Nf3 develops naturally and prepares short castling.",
    "The knight controls key squares d4 and e5.",
    "Keeps flexibility — you can follow with Bc4, d4, or e5 depending on Black's response.",
  ],
  risks: [
    "Avoid premature pawn advances before completing development.",
    "Watch for ...Bc5, which may pressure f2.",
  ],
  confidence: "medium",
  style: "balanced",
};

interface CoachPanelProps {
  coachingMode: CoachingMode;
  onCoachingModeChange: (mode: CoachingMode) => void;
  canAsk: boolean;
}

export function CoachPanel({
  coachingMode,
  onCoachingModeChange,
  canAsk,
}: CoachPanelProps) {
  const [status, setStatus] = useState<CoachStatus>("idle");
  const [response, setResponse] = useState<CoachAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAskCoach() {
    setStatus("loading");
    setError(null);
    // Simulate async backend call — replace with real fetch in V2
    setTimeout(() => {
      setResponse({ ...MOCK_RESPONSE, style: coachingMode });
      setStatus("success");
    }, 1200);
  }

  return (
    <div className="coach-panel">
      <div className="panel-label">COACH</div>

      <div className="coach-body">
        {status === "idle" && (
          <p className="coach-idle">
            Make a move, then ask the coach for guidance.
          </p>
        )}

        {status === "loading" && (
          <div className="coach-loading">
            <span className="coach-spinner" aria-hidden="true" />
            <span>Analyzing position…</span>
          </div>
        )}

        {status === "success" && response && (
          <div className="coach-response">
            <div className="coach-response-header">
              <span className="coach-move">{response.recommendedMove}</span>
              <span
                className={`coach-confidence coach-confidence--${response.confidence}`}
              >
                {response.confidence}
              </span>
            </div>

            <p className="coach-summary">{response.summary}</p>

            {response.alternativeMoves.length > 0 && (
              <div className="coach-alts">
                <span className="coach-alts-label">Also consider</span>
                {response.alternativeMoves.map((m) => (
                  <span key={m} className="coach-alt-chip">
                    {m}
                  </span>
                ))}
              </div>
            )}

            <div className="coach-section">
              <div className="coach-section-label">Reasoning</div>
              <ul className="coach-list">
                {response.reasoning.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="coach-section">
              <div className="coach-section-label">Risks</div>
              <ul className="coach-list coach-list--risks">
                {response.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="coach-error">
            {error ?? "Something went wrong. Try again."}
          </div>
        )}
      </div>

      <div className="coach-actions">
        <select
          className="mode-select"
          value={coachingMode}
          onChange={(e) => {
            const val = e.target.value;
            if (
              val === "balanced" ||
              val === "aggressive" ||
              val === "defensive"
            ) {
              onCoachingModeChange(val);
            }
          }}
        >
          <option value="balanced">balanced</option>
          <option value="aggressive">aggressive</option>
          <option value="defensive">defensive</option>
        </select>
        <button
          className="ask-coach-btn"
          disabled={!canAsk || status === "loading"}
          onClick={handleAskCoach}
        >
          {status === "loading" ? "Thinking…" : "Ask Coach"}
        </button>
      </div>
    </div>
  );
}
