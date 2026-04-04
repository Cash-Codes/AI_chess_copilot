import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import type {
  CoachAnalyzeRequest,
  CoachStreamChunk,
} from "@ai-chess-copilot/shared";

vi.mock("../services/coachApi", () => ({ streamAnalysis: vi.fn() }));
import { streamAnalysis } from "../services/coachApi";
const mockStreamAnalysis = vi.mocked(streamAnalysis);

// Preset move sequence used by the "Make Move" button in the board mock.
// Each click fires the next move; wraps around if exhausted.
const MOVE_SEQUENCE = [
  { sourceSquare: "e2", targetSquare: "e4" }, // white
  { sourceSquare: "e7", targetSquare: "e5" }, // black
  { sourceSquare: "d2", targetSquare: "d4" }, // white
  { sourceSquare: "d7", targetSquare: "d5" }, // black
];
let moveIdx = 0;

// Mock react-chessboard so jsdom can render the full App tree.
vi.mock("react-chessboard", () => ({
  Chessboard: ({
    options,
  }: {
    options: {
      position: string;
      onPieceDrop?: (args: {
        sourceSquare: string;
        targetSquare: string;
      }) => boolean;
    };
  }) => (
    <div data-testid="mock-chessboard" data-position={options.position}>
      <button
        data-testid="make-move-btn"
        onClick={() => {
          const move = MOVE_SEQUENCE[moveIdx % MOVE_SEQUENCE.length];
          moveIdx++;
          options.onPieceDrop?.(move);
        }}
      >
        Make Move
      </button>
    </div>
  ),
}));

beforeEach(() => {
  moveIdx = 0;
  mockStreamAnalysis.mockReset();
});

describe("App", () => {
  describe("initial render", () => {
    it("renders the app title '♟ AI Chess Copilot'", () => {
      render(<App />);
      expect(screen.getByText(/AI Chess Copilot/)).toBeInTheDocument();
    });

    it("renders the default coaching mode indicator as 'balanced'", () => {
      render(<App />);
      // The mode-indicator span contains both the dot span and the mode text.
      // Use getAllByText in case the select also has 'balanced' visible.
      const matches = screen.getAllByText("balanced");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("renders the COACH panel label", () => {
      render(<App />);
      expect(screen.getByText("COACH")).toBeInTheDocument();
    });

    it("renders the MOVES panel label", () => {
      render(<App />);
      expect(screen.getByText("MOVES")).toBeInTheDocument();
    });

    it("shows the empty move history message on first render", () => {
      render(<App />);
      expect(screen.getByText("No moves yet.")).toBeInTheDocument();
    });

    it("renders the Ask Coach button as disabled on first render (no moves yet)", () => {
      render(<App />);
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeDisabled();
    });

    it("renders the chessboard", () => {
      render(<App />);
      expect(screen.getByTestId("mock-chessboard")).toBeInTheDocument();
    });

    it("passes the initial FEN to the chessboard", () => {
      render(<App />);
      const INITIAL_FEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      expect(screen.getByTestId("mock-chessboard")).toHaveAttribute(
        "data-position",
        INITIAL_FEN,
      );
    });
  });

  describe("coaching mode select", () => {
    it("changes the coaching mode when a new option is selected", async () => {
      const user = userEvent.setup();
      render(<App />);
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "aggressive");
      expect((select as HTMLSelectElement).value).toBe("aggressive");
    });

    it("reflects 'defensive' in the select after choosing it", async () => {
      const user = userEvent.setup();
      render(<App />);
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "defensive");
      expect((select as HTMLSelectElement).value).toBe("defensive");
    });
  });

  // Regression guard for key={fen} on CoachPanel in App.tsx.
  // CoachPanel has no internal fen-based reset — the reset relies entirely on
  // React remounting it when the key changes. If that key assignment is ever
  // removed, the panel will stay in its previous state after a new move.
  describe("CoachPanel resets after a new move (key={fen} regression guard)", () => {
    it("shows idle text after making a new move following a completed analysis", async () => {
      const ALL_CHUNKS: CoachStreamChunk[] = [
        { type: "move", value: "Nf3" },
        { type: "confidence", value: "medium" },
      ];
      mockStreamAnalysis.mockImplementation(
        (
          _req: CoachAnalyzeRequest,
          callbacks: Parameters<typeof streamAnalysis>[1],
        ) => {
          for (const chunk of ALL_CHUNKS) callbacks.onChunk(chunk);
          callbacks.onComplete();
        },
      );

      const user = userEvent.setup();
      render(<App />);

      // e2-e4 (white), then e7-e5 (black) → lastOpponentMove set, canAsk=true
      await user.click(screen.getByTestId("make-move-btn"));
      await user.click(screen.getByTestId("make-move-btn"));

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));
      await screen.findByText("Nf3"); // complete state

      // d2-d4 (white): FEN changes → App remounts CoachPanel via key={fen}
      await user.click(screen.getByTestId("make-move-btn"));

      expect(
        screen.getByText("Make a move, then ask the coach for guidance."),
      ).toBeInTheDocument();
    });
  });
});
