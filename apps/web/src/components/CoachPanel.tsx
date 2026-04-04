import type { CoachingMode } from "../hooks/useGameState";

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
  return (
    <div className="coach-panel">
      <div className="panel-label">COACH</div>
      <p className="coach-idle">
        Make a move, then ask the coach for guidance.
      </p>
      <div className="coach-actions">
        <select
          className="mode-select"
          value={coachingMode}
          onChange={(e) =>
            onCoachingModeChange(e.target.value as CoachingMode)
          }
        >
          <option value="balanced">balanced</option>
          <option value="aggressive">aggressive</option>
          <option value="defensive">defensive</option>
        </select>
        <button className="ask-coach-btn" disabled={!canAsk}>
          Ask Coach
        </button>
      </div>
    </div>
  );
}
