import { useEffect, useRef, useState } from "react";
import type {
  CoachAnalyzeResponse,
  CoachingMode,
  CoachStreamChunk,
  SideToMove,
} from "@ai-chess-copilot/shared";
import { streamAnalysis } from "../services/coachApi";
import { useSpeech } from "../hooks/useSpeech";

type CoachStatus = "idle" | "streaming" | "complete" | "error";

type CoachState = {
  status: CoachStatus;
  partial: Partial<CoachAnalyzeResponse>;
  error: string | null;
};

const IDLE: CoachState = { status: "idle", partial: {}, error: null };

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
    case "move":
      return { ...prev, recommendedMove: chunk.value };
    case "alternatives":
      return { ...prev, alternativeMoves: chunk.value };
    case "confidence":
      return { ...prev, confidence: chunk.value };
    case "summary":
      return { ...prev, summary: chunk.value };
    case "reasoning":
      return { ...prev, reasoning: chunk.value };
    case "risks":
      return { ...prev, risks: chunk.value };
    case "style":
      return { ...prev, style: chunk.value };
    default:
      return prev; // unknown future chunk types are ignored
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
  const [{ status, partial, error }, setCoachState] =
    useState<CoachState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const {
    supported: speechSupported,
    enabled: voiceOn,
    setEnabled: setVoiceOn,
    speak,
    cancel,
  } = useSpeech();

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      cancel();
    };
  }, [cancel]);

  // Auto-read when the response is complete and voice is on
  useEffect(() => {
    if (status !== "complete" || !voiceOn) return;
    const move = partial.recommendedMove;
    const summary = partial.summary;
    const risk = partial.risks?.[0];
    if (!move) return;
    const script = [
      `Consider ${move}.`,
      summary,
      risk ? `Watch out: ${risk}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    speak(script);
  }, [
    status,
    voiceOn,
    partial.recommendedMove,
    partial.summary,
    partial.risks,
    speak,
  ]);

  function handleAskCoach() {
    if (!lastOpponentMove) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCoachState({ status: "streaming", partial: {}, error: null });

    streamAnalysis(
      { fen, moveHistory, sideToMove, lastOpponentMove, coachingMode },
      {
        onChunk: (chunk) =>
          setCoachState((prev) => ({
            ...prev,
            partial: applyChunk(prev.partial, chunk),
          })),
        onComplete: () =>
          setCoachState((prev) => ({ ...prev, status: "complete" })),
        onError: (err) =>
          setCoachState({ status: "error", partial: {}, error: err.message }),
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
        {speechSupported && (
          <button
            className={`voice-toggle-btn${voiceOn ? " voice-toggle-btn--on" : ""}`}
            title={voiceOn ? "Voice on" : "Voice off"}
            aria-pressed={voiceOn}
            onClick={() => setVoiceOn((v) => !v)}
          >
            {voiceOn ? "🔊" : "🔇"}
          </button>
        )}
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
          disabled={!canAsk || !lastOpponentMove || status === "streaming"}
          onClick={handleAskCoach}
        >
          {status === "streaming" ? "Thinking…" : "Ask Coach"}
        </button>
      </div>
    </div>
  );
}
