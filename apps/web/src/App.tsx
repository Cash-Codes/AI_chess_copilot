import { useState } from "react";
import { useGameState, type CoachingMode } from "./hooks/useGameState";
import { ChessBoard } from "./components/ChessBoard";
import { MoveHistory } from "./components/MoveHistory";
import { CoachPanel } from "./components/CoachPanel";
import "./App.css";

function App() {
  const { fen, moveHistory, makeMove } = useGameState();
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
            coachingMode={coachingMode}
            onCoachingModeChange={setCoachingMode}
            canAsk={moveHistory.length > 0}
          />
          <MoveHistory moves={moveHistory} />
        </aside>
      </main>
    </div>
  );
}

export default App;
