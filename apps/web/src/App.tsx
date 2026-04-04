import { useState } from "react";
import { useGameState, type CoachingMode } from "./hooks/useGameState";
import { ChessBoard } from "./components/ChessBoard";
import { MoveHistory } from "./components/MoveHistory";
import { CoachPanel } from "./components/CoachPanel";
import "./App.css";

function App() {
  const { fen, moveHistory, sideToMove, lastOpponentMove, userSide, makeMove } =
    useGameState();
  const [coachingMode, setCoachingMode] = useState<CoachingMode>("balanced");

  return (
    <div id="app">
      <header className="app-header">
        <span className="app-title">♟ AI Chess Copilot</span>
        <span className="mode-indicator">
          <span className="mode-dot" />
          {coachingMode}
        </span>
      </header>
      <main className="app-main">
        <section className="board-section">
          <ChessBoard fen={fen} onMove={makeMove} />
        </section>
        <aside className="side-panel">
          <CoachPanel
            key={fen}
            coachingMode={coachingMode}
            onCoachingModeChange={setCoachingMode}
            canAsk={lastOpponentMove !== null}
            fen={fen}
            moveHistory={moveHistory}
            sideToMove={sideToMove}
            lastOpponentMove={lastOpponentMove}
          />
          <MoveHistory moves={moveHistory} />
          <details className="coach-context-debug">
            <summary>Coach context</summary>
            <dl>
              <dt>playing as</dt>
              <dd>{userSide}</dd>
              <dt>side to move</dt>
              <dd>{sideToMove}</dd>
              <dt>last opponent move</dt>
              <dd>{lastOpponentMove ?? "—"}</dd>
              <dt>move count</dt>
              <dd>{moveHistory.length}</dd>
              <dt>fen</dt>
              <dd className="fen">{fen}</dd>
            </dl>
          </details>
        </aside>
      </main>
    </div>
  );
}

export default App;
