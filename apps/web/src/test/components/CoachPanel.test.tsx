import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachPanel } from "../../components/CoachPanel";
import type { CoachAnalyzeRequest, CoachingMode, CoachStreamChunk } from "@ai-chess-copilot/shared";

vi.mock("../../services/coachApi", () => ({
  streamAnalysis: vi.fn(),
}));

import { streamAnalysis } from "../../services/coachApi";
const mockStreamAnalysis = vi.mocked(streamAnalysis);

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const ALL_CHUNKS: CoachStreamChunk[] = [
  { type: "move", value: "Nf3" },
  { type: "alternatives", value: ["Bc4", "d4"] },
  { type: "confidence", value: "medium" },
  { type: "summary", value: "Develop a knight toward the center while keeping all options open for the middlegame." },
  { type: "reasoning", value: ["Nf3 develops naturally and prepares short castling.", "The knight controls key squares d4 and e5."] },
  { type: "risks", value: ["Avoid premature pawn advances before completing development."] },
  { type: "style", value: "balanced" },
];

// Helper: simulate streamAnalysis delivering all chunks then completing
function simulateStream(chunks = ALL_CHUNKS) {
  mockStreamAnalysis.mockImplementation(
    (_req: CoachAnalyzeRequest, callbacks: Parameters<typeof streamAnalysis>[1]) => {
      for (const chunk of chunks) callbacks.onChunk(chunk);
      callbacks.onComplete();
    },
  );
}

// Helper: simulate streamAnalysis that never resolves (stays in streaming state)
function simulatePendingStream() {
  mockStreamAnalysis.mockImplementation(() => {
    // never calls onChunk or onComplete
  });
}

function renderCoachPanel(
  overrides: Partial<{
    coachingMode: CoachingMode;
    onCoachingModeChange: (m: CoachingMode) => void;
    canAsk: boolean;
    fen: string;
    moveHistory: string[];
    sideToMove: "white" | "black";
    lastOpponentMove: string | null;
  }> = {},
) {
  const defaults = {
    coachingMode: "balanced" as CoachingMode,
    onCoachingModeChange: vi.fn(),
    canAsk: false,
    fen: INITIAL_FEN,
    moveHistory: [],
    sideToMove: "white" as const,
    lastOpponentMove: null,
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<CoachPanel {...props} />), ...props };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CoachPanel", () => {
  describe("idle state", () => {
    it("renders the COACH panel label", () => {
      renderCoachPanel();
      expect(screen.getByText("COACH")).toBeInTheDocument();
    });

    it("renders the idle guidance message", () => {
      renderCoachPanel();
      expect(screen.getByText("Make a move, then ask the coach for guidance.")).toBeInTheDocument();
    });

    it("renders an Ask Coach button", () => {
      renderCoachPanel();
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeInTheDocument();
    });

    it("renders all three coaching mode options", () => {
      renderCoachPanel();
      expect(screen.getByRole("option", { name: "balanced" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "aggressive" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "defensive" })).toBeInTheDocument();
    });

    it("does not show loading indicator in idle state", () => {
      renderCoachPanel();
      expect(screen.queryByText("Analyzing position…")).not.toBeInTheDocument();
    });

    it("does not show error in idle state", () => {
      renderCoachPanel();
      expect(document.querySelector(".coach-error")).not.toBeInTheDocument();
    });
  });

  describe("button disabled/enabled", () => {
    it("disables Ask Coach when canAsk is false", () => {
      renderCoachPanel({ canAsk: false });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeDisabled();
    });

    it("enables Ask Coach when canAsk is true", () => {
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled();
    });

    it("disables Ask Coach when canAsk is true but lastOpponentMove is null", () => {
      renderCoachPanel({ canAsk: true, lastOpponentMove: null });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeDisabled();
    });
  });

  describe("streaming state (before any chunks arrive)", () => {
    it("shows 'Analyzing position…' before first chunk", async () => {
      simulatePendingStream();
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByText("Analyzing position…")).toBeInTheDocument();
    });

    it("shows 'Thinking…' on button during streaming", async () => {
      simulatePendingStream();
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();
    });

    it("hides the idle message while streaming", async () => {
      simulatePendingStream();
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.queryByText("Make a move, then ask the coach for guidance.")).not.toBeInTheDocument();
    });
  });

  describe("progressive rendering — partial chunks", () => {
    it("renders the move chip as soon as the move chunk arrives", async () => {
      mockStreamAnalysis.mockImplementation(
        (_req, callbacks: Parameters<typeof streamAnalysis>[1]) => {
          // Only deliver the move chunk — nothing else yet
          callbacks.onChunk({ type: "move", value: "Nf3" });
        },
      );
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByText("Nf3")).toBeInTheDocument();
      // Summary has not arrived yet
      expect(screen.queryByText(/Develop a knight/)).not.toBeInTheDocument();
    });

    it("does not render reasoning before that chunk arrives", async () => {
      mockStreamAnalysis.mockImplementation(
        (_req, callbacks: Parameters<typeof streamAnalysis>[1]) => {
          callbacks.onChunk({ type: "move", value: "Nf3" });
          callbacks.onChunk({ type: "summary", value: "Develop a knight toward the center while keeping all options open for the middlegame." });
          // reasoning not sent yet
        },
      );
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByText("Nf3")).toBeInTheDocument();
      expect(screen.queryByText("Reasoning")).not.toBeInTheDocument();
    });
  });

  describe("complete state (all chunks delivered)", () => {
    async function clickAndComplete() {
      simulateStream();
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });
      await user.click(screen.getByRole("button", { name: "Ask Coach" }));
      await waitFor(() => screen.getByText("Nf3"));
    }

    it("shows recommended move", async () => {
      await clickAndComplete();
      expect(screen.getByText("Nf3")).toBeInTheDocument();
    });

    it("shows confidence badge", async () => {
      await clickAndComplete();
      expect(screen.getByText("medium")).toBeInTheDocument();
    });

    it("shows summary", async () => {
      await clickAndComplete();
      expect(screen.getByText("Develop a knight toward the center while keeping all options open for the middlegame.")).toBeInTheDocument();
    });

    it("shows alternative move chips", async () => {
      await clickAndComplete();
      expect(screen.getByText("Bc4")).toBeInTheDocument();
      expect(screen.getByText("d4")).toBeInTheDocument();
    });

    it("shows Reasoning section", async () => {
      await clickAndComplete();
      expect(screen.getByText("Reasoning")).toBeInTheDocument();
    });

    it("shows Risks section", async () => {
      await clickAndComplete();
      expect(screen.getByText("Risks")).toBeInTheDocument();
    });

    it("re-enables Ask Coach button after completion", async () => {
      await clickAndComplete();
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled();
    });

    it("sends the correct payload to streamAnalysis", async () => {
      simulateStream();
      const user = userEvent.setup();
      const fen = INITIAL_FEN;
      const moveHistory = ["e4", "e5"];
      render(
        <CoachPanel
          coachingMode="aggressive"
          onCoachingModeChange={vi.fn()}
          canAsk={true}
          fen={fen}
          moveHistory={moveHistory}
          sideToMove="white"
          lastOpponentMove="e5"
        />,
      );
      await user.click(screen.getByRole("button", { name: "Ask Coach" }));
      await waitFor(() => screen.getByText("Nf3"));

      expect(mockStreamAnalysis).toHaveBeenCalledWith(
        { fen, moveHistory, sideToMove: "white", lastOpponentMove: "e5", coachingMode: "aggressive" },
        expect.objectContaining({ onChunk: expect.any(Function), onComplete: expect.any(Function), onError: expect.any(Function) }),
        expect.any(AbortSignal),
      );
    });
  });

  describe("error state", () => {
    it("shows error message when streamAnalysis calls onError", async () => {
      mockStreamAnalysis.mockImplementation(
        (_req, callbacks: Parameters<typeof streamAnalysis>[1]) => {
          callbacks.onError(new Error("Server error"));
        },
      );
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      await waitFor(() => expect(screen.getByText("Server error")).toBeInTheDocument());
    });

    it("re-enables Ask Coach button after error", async () => {
      mockStreamAnalysis.mockImplementation(
        (_req, callbacks: Parameters<typeof streamAnalysis>[1]) => {
          callbacks.onError(new Error("Server error"));
        },
      );
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled(),
      );
    });

    it("does not show error on fresh render", () => {
      renderCoachPanel();
      expect(document.querySelector(".coach-error")).not.toBeInTheDocument();
    });
  });

  describe("select reflects coaching mode", () => {
    it("shows 'balanced' selected", () => {
      renderCoachPanel({ coachingMode: "balanced" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("balanced");
    });

    it("shows 'aggressive' selected", () => {
      renderCoachPanel({ coachingMode: "aggressive" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("aggressive");
    });

    it("shows 'defensive' selected", () => {
      renderCoachPanel({ coachingMode: "defensive" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("defensive");
    });
  });

  describe("onCoachingModeChange callback", () => {
    it("calls onCoachingModeChange with 'aggressive' when selected", async () => {
      const user = userEvent.setup();
      const onCoachingModeChange = vi.fn();
      renderCoachPanel({ onCoachingModeChange, coachingMode: "balanced" });

      await user.selectOptions(screen.getByRole("combobox"), "aggressive");

      expect(onCoachingModeChange).toHaveBeenCalledWith("aggressive");
    });

    it("calls onCoachingModeChange with 'defensive' when selected", async () => {
      const user = userEvent.setup();
      const onCoachingModeChange = vi.fn();
      renderCoachPanel({ onCoachingModeChange, coachingMode: "balanced" });

      await user.selectOptions(screen.getByRole("combobox"), "defensive");

      expect(onCoachingModeChange).toHaveBeenCalledWith("defensive");
    });

    it("calls onCoachingModeChange with 'balanced' when switching back", async () => {
      const user = userEvent.setup();
      const onCoachingModeChange = vi.fn();
      renderCoachPanel({ onCoachingModeChange, coachingMode: "aggressive" });

      await user.selectOptions(screen.getByRole("combobox"), "balanced");

      expect(onCoachingModeChange).toHaveBeenCalledWith("balanced");
    });
  });

  describe("resets on FEN change", () => {
    it("returns to idle state when fen prop changes", () => {
      simulateStream();
      const { rerender } = renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      act(() => {
        rerender(
          <CoachPanel
            coachingMode="balanced"
            onCoachingModeChange={vi.fn()}
            canAsk={false}
            fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
            moveHistory={["e4"]}
            sideToMove="black"
            lastOpponentMove={null}
          />,
        );
      });

      expect(screen.getByText("Make a move, then ask the coach for guidance.")).toBeInTheDocument();
    });
  });
});
