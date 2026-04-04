import { useEffect, useRef, useState } from "react";
import type {
  CoachAnalyzeResponse,
  CoachingMode,
  CoachStreamChunk,
  SideToMove,
} from "@ai-chess-copilot/shared";
import { streamAnalysis } from "../services/coachApi";

type CoachStatus = "idle" | "streaming" | "complete" | "error";

interface CoachPanelProps {
  coachingMode: CoachingMode;
  onCoachingModeChange: (mode: CoachingMode) => void;
  canAsk: boolean;
  fen: string;
  moveHistory: string[];
  sideToMove: SideToMove;
  lastOpponentMove: string | null;
}

function applyChunk(
  prev: Partial<CoachAnalyzeResponse>,
  chunk: CoachStreamChunk,
): Partial<CoachAnalyzeResponse> {
  switch (chunk.type) {
    case "move":         return { ...prev, recommendedMove: chunk.value };
    case "alternatives": return { ...prev, alternativeMoves: chunk.value };
    case "confidence":   return { ...prev, confidence: chunk.value };
    case "summary":      return { ...prev, summary: chunk.value };
    case "reasoning":    return { ...prev, reasoning: chunk.value };
    case "risks":        return { ...prev, risks: chunk.value };
    case "style":        return { ...prev, style: chunk.value };
    default:             return prev; // unknown future chunk types are ignored
  }
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
  const [partial, setPartial] = useState<Partial<CoachAnalyzeResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset when the board position changes
  useEffect(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setPartial({});
    setError(null);
  }, [fen]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function handleAskCoach() {
    if (!lastOpponentMove) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setPartial({});
    setError(null);

    streamAnalysis(
      { fen, moveHistory, sideToMove, lastOpponentMove, coachingMode },
      {
        onChunk: (chunk) => setPartial((prev) => applyChunk(prev, chunk)),
        onComplete: () => setStatus("complete"),
        onError: (err) => {
          setError(err.message);
          setStatus("error");
        },
      },
      controller.signal,
    );
  }

  const isActive = status === "streaming" || status === "complete";

  return (
    <div className="coach-panel">
      <div className="panel-label">COACH</div>

      <div className="coach-body">
        {status === "idle" && (
          <p className="coach-idle">
            Make a move, then ask the coach for guidance.
          </p>
        )}

        {isActive && (
          <div className="coach-response">
            {partial.recommendedMove !== undefined ? (
              <div className="coach-response-header">
                <span className="coach-move">{partial.recommendedMove}</span>
                {partial.confidence !== undefined && (
                  <span
                    className={`coach-confidence coach-confidence--${partial.confidence}`}
                  >
                    {partial.confidence}
                  </span>
                )}
              </div>
            ) : (
              <div className="coach-loading">
                <span className="coach-spinner" aria-hidden="true" />
                <span>Analyzing position…</span>
              </div>
            )}

            {partial.summary !== undefined && (
              <p className="coach-summary">{partial.summary}</p>
            )}

            {partial.alternativeMoves !== undefined &&
              partial.alternativeMoves.length > 0 && (
                <div className="coach-alts">
                  <span className="coach-alts-label">Also consider</span>
                  {partial.alternativeMoves.map((m) => (
                    <span key={m} className="coach-alt-chip">
                      {m}
                    </span>
                  ))}
                </div>
              )}

            {partial.reasoning !== undefined && (
              <div className="coach-section">
                <div className="coach-section-label">Reasoning</div>
                <ul className="coach-list">
                  {partial.reasoning.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {partial.risks !== undefined && (
              <div className="coach-section">
                <div className="coach-section-label">Risks</div>
                <ul className="coach-list coach-list--risks">
                  {partial.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
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
          disabled={!canAsk || status === "streaming"}
          onClick={handleAskCoach}
        >
          {status === "streaming" ? "Thinking…" : "Ask Coach"}
        </button>
      </div>
    </div>
  );
}
