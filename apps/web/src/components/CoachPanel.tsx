import { useState } from "react";
import type { CoachAnalyzeResponse, CoachingMode, SideToMove } from "@ai-chess-copilot/shared";
import { analyzePosition } from "../services/coachApi";

type CoachStatus = "idle" | "loading" | "success" | "error";

interface CoachPanelProps {
  coachingMode: CoachingMode;
  onCoachingModeChange: (mode: CoachingMode) => void;
  canAsk: boolean;
  fen: string;
  moveHistory: string[];
  sideToMove: SideToMove;
  lastOpponentMove: string | null;
}

export function CoachPanel({
  coachingMode,
  onCoachingModeChange,
  canAsk,
  fen,
  moveHistory,
  sideToMove,
  lastOpponentMove,
}: CoachPanelProps) {
  const [status, setStatus] = useState<CoachStatus>("idle");
  const [response, setResponse] = useState<CoachAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAskCoach() {
    if (!lastOpponentMove) return;
    setStatus("loading");
    setError(null);
    try {
      const result = await analyzePosition({
        fen,
        moveHistory,
        sideToMove,
        lastOpponentMove,
        coachingMode,
      });
      setResponse(result);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatus("error");
    }
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
