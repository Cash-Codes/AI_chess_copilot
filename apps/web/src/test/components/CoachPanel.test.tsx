import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachPanel } from "../../components/CoachPanel";
import type { CoachAnalyzeResponse, CoachingMode } from "@ai-chess-copilot/shared";

// Mock the fetch layer so tests don't hit a real server
vi.mock("../../services/coachApi", () => ({
  analyzePosition: vi.fn(),
}));

import { analyzePosition } from "../../services/coachApi";
const mockAnalyzePosition = vi.mocked(analyzePosition);

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

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
  describe("idle state (default render)", () => {
    it("renders the COACH panel label", () => {
      renderCoachPanel();
      expect(screen.getByText("COACH")).toBeInTheDocument();
    });

    it("renders the idle guidance message", () => {
      renderCoachPanel();
      expect(
        screen.getByText("Make a move, then ask the coach for guidance."),
      ).toBeInTheDocument();
    });

    it("renders an Ask Coach button", () => {
      renderCoachPanel();
      expect(
        screen.getByRole("button", { name: "Ask Coach" }),
      ).toBeInTheDocument();
    });

    it("renders a coaching mode select dropdown", () => {
      renderCoachPanel();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
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

    it("does not show coach response in idle state", () => {
      renderCoachPanel();
      expect(screen.queryByText("Nf3")).not.toBeInTheDocument();
    });

    it("does not show error in idle state", () => {
      renderCoachPanel();
      expect(document.querySelector(".coach-error")).not.toBeInTheDocument();
    });
  });

  describe("Ask Coach button disabled/enabled state", () => {
    it("disables the Ask Coach button when canAsk is false", () => {
      renderCoachPanel({ canAsk: false });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeDisabled();
    });

    it("enables the Ask Coach button when canAsk is true", () => {
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled();
    });
  });

  describe("loading state", () => {
    it("shows 'Thinking…' on the button immediately after click", async () => {
      // analyzePosition never resolves during this test
      mockAnalyzePosition.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByRole("button", { name: "Thinking…" })).toBeInTheDocument();
    });

    it("shows 'Analyzing position…' text during loading", async () => {
      mockAnalyzePosition.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByText("Analyzing position…")).toBeInTheDocument();
    });

    it("hides the idle message during loading", async () => {
      mockAnalyzePosition.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(
        screen.queryByText("Make a move, then ask the coach for guidance."),
      ).not.toBeInTheDocument();
    });

    it("disables the button while loading", async () => {
      mockAnalyzePosition.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();
    });
  });

  describe("success state", () => {
    beforeEach(() => {
      mockAnalyzePosition.mockResolvedValue(MOCK_RESPONSE);
    });

    async function clickAskCoach() {
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });
      await user.click(screen.getByRole("button", { name: "Ask Coach" }));
      await waitFor(() => screen.getByText("Nf3"));
    }

    it("shows the recommended move after success", async () => {
      await clickAskCoach();
      expect(screen.getByText("Nf3")).toBeInTheDocument();
    });

    it("shows the confidence badge after success", async () => {
      await clickAskCoach();
      expect(screen.getByText("medium")).toBeInTheDocument();
    });

    it("shows the summary text after success", async () => {
      await clickAskCoach();
      expect(
        screen.getByText(
          "Develop a knight toward the center while keeping all options open for the middlegame.",
        ),
      ).toBeInTheDocument();
    });

    it("shows 'Also consider' label with alternative move chips", async () => {
      await clickAskCoach();
      expect(screen.getByText("Also consider")).toBeInTheDocument();
      expect(screen.getByText("Bc4")).toBeInTheDocument();
      expect(screen.getByText("d4")).toBeInTheDocument();
    });

    it("shows all reasoning list items after success", async () => {
      await clickAskCoach();
      expect(
        screen.getByText("Nf3 develops naturally and prepares short castling."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The knight controls key squares d4 and e5."),
      ).toBeInTheDocument();
    });

    it("shows all risks list items after success", async () => {
      await clickAskCoach();
      expect(
        screen.getByText("Avoid premature pawn advances before completing development."),
      ).toBeInTheDocument();
    });

    it("restores 'Ask Coach' button and re-enables it after success", async () => {
      await clickAskCoach();
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled();
    });

    it("hides loading indicator after success", async () => {
      await clickAskCoach();
      expect(screen.queryByText("Analyzing position…")).not.toBeInTheDocument();
    });

    it("sends the correct payload to analyzePosition", async () => {
      const user = userEvent.setup();
      const fen = INITIAL_FEN;
      const moveHistory = ["e4", "e5"];
      renderCoachPanel({
        canAsk: true,
        fen,
        moveHistory,
        sideToMove: "white",
        lastOpponentMove: "e5",
        coachingMode: "aggressive",
      });
      await user.click(screen.getByRole("button", { name: "Ask Coach" }));
      await waitFor(() => screen.getByText("Nf3"));

      expect(mockAnalyzePosition).toHaveBeenCalledWith(
        {
          fen,
          moveHistory,
          sideToMove: "white",
          lastOpponentMove: "e5",
          coachingMode: "aggressive",
        },
        expect.any(AbortSignal),
      );
    });
  });

  describe("error state", () => {
    it("shows error message when analyzePosition rejects", async () => {
      mockAnalyzePosition.mockRejectedValue(new Error("Server error"));
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      await waitFor(() =>
        expect(screen.getByText("Server error")).toBeInTheDocument(),
      );
    });

    it("re-enables Ask Coach button after an error", async () => {
      mockAnalyzePosition.mockRejectedValue(new Error("Server error"));
      const user = userEvent.setup();
      renderCoachPanel({ canAsk: true, lastOpponentMove: "e5" });

      await user.click(screen.getByRole("button", { name: "Ask Coach" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled(),
      );
    });

    it("does not show error message on fresh render", () => {
      renderCoachPanel();
      expect(document.querySelector(".coach-error")).not.toBeInTheDocument();
    });
  });

  describe("select reflects the current coaching mode", () => {
    it("shows 'balanced' as the selected value", () => {
      renderCoachPanel({ coachingMode: "balanced" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("balanced");
    });

    it("shows 'aggressive' as the selected value", () => {
      renderCoachPanel({ coachingMode: "aggressive" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("aggressive");
    });

    it("shows 'defensive' as the selected value", () => {
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
});
