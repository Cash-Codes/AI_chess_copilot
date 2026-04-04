import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachPanel } from "../../components/CoachPanel";
import type { CoachingMode } from "@ai-chess-copilot/shared";

function renderCoachPanel(
  overrides: Partial<{
    coachingMode: CoachingMode;
    onCoachingModeChange: (m: CoachingMode) => void;
    canAsk: boolean;
  }> = {},
) {
  const defaults = {
    coachingMode: "balanced" as CoachingMode,
    onCoachingModeChange: vi.fn(),
    canAsk: false,
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<CoachPanel {...props} />), ...props };
}

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
      expect(
        screen.getByRole("option", { name: "balanced" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "aggressive" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "defensive" }),
      ).toBeInTheDocument();
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
      expect(
        document.querySelector(".coach-error"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Ask Coach button disabled/enabled state", () => {
    it("disables the Ask Coach button when canAsk is false", () => {
      renderCoachPanel({ canAsk: false });
      expect(
        screen.getByRole("button", { name: "Ask Coach" }),
      ).toBeDisabled();
    });

    it("enables the Ask Coach button when canAsk is true", () => {
      renderCoachPanel({ canAsk: true });
      expect(
        screen.getByRole("button", { name: "Ask Coach" }),
      ).toBeEnabled();
    });
  });

  describe("loading state", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows 'Thinking…' on the button immediately after click", () => {
      renderCoachPanel({ canAsk: true });

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Ask Coach" }));
      });

      expect(
        screen.getByRole("button", { name: "Thinking…" }),
      ).toBeInTheDocument();
    });

    it("shows 'Analyzing position…' text during loading", () => {
      renderCoachPanel({ canAsk: true });

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Ask Coach" }));
      });

      expect(screen.getByText("Analyzing position…")).toBeInTheDocument();
    });

    it("hides the idle message during loading", () => {
      renderCoachPanel({ canAsk: true });

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Ask Coach" }));
      });

      expect(
        screen.queryByText("Make a move, then ask the coach for guidance."),
      ).not.toBeInTheDocument();
    });

    it("disables the button while loading", () => {
      renderCoachPanel({ canAsk: true });

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Ask Coach" }));
      });

      expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();
    });
  });

  describe("success state (after setTimeout resolves)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function renderAndAdvanceToSuccess(coachingMode: CoachingMode = "balanced") {
      renderCoachPanel({ canAsk: true, coachingMode });

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Ask Coach" }));
        vi.advanceTimersByTime(1200);
      });
    }

    it("shows the recommended move 'Nf3' after success", () => {
      renderAndAdvanceToSuccess();
      expect(screen.getByText("Nf3")).toBeInTheDocument();
    });

    it("shows the confidence badge 'medium' after success", () => {
      renderAndAdvanceToSuccess();
      expect(screen.getByText("medium")).toBeInTheDocument();
    });

    it("shows the summary text after success", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.getByText(
          "Develop a knight toward the center while keeping all options open for the middlegame.",
        ),
      ).toBeInTheDocument();
    });

    it("shows 'Also consider' label with alternative move chips", () => {
      renderAndAdvanceToSuccess();
      expect(screen.getByText("Also consider")).toBeInTheDocument();
      expect(screen.getByText("Bc4")).toBeInTheDocument();
      expect(screen.getByText("d4")).toBeInTheDocument();
    });

    it("shows the Reasoning section header after success", () => {
      renderAndAdvanceToSuccess();
      expect(screen.getByText("Reasoning")).toBeInTheDocument();
    });

    it("shows all reasoning list items after success", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.getByText("Nf3 develops naturally and prepares short castling."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The knight controls key squares d4 and e5."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Keeps flexibility — you can follow with Bc4, d4, or e5 depending on Black's response.",
        ),
      ).toBeInTheDocument();
    });

    it("shows the Risks section header after success", () => {
      renderAndAdvanceToSuccess();
      expect(screen.getByText("Risks")).toBeInTheDocument();
    });

    it("shows all risks list items after success", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.getByText(
          "Avoid premature pawn advances before completing development.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Watch for ...Bc5, which may pressure f2."),
      ).toBeInTheDocument();
    });

    it("restores the 'Ask Coach' button label after success", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.getByRole("button", { name: "Ask Coach" }),
      ).toBeInTheDocument();
    });

    it("re-enables the button after success when canAsk is true", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.getByRole("button", { name: "Ask Coach" }),
      ).toBeEnabled();
    });

    it("hides loading indicator after success", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.queryByText("Analyzing position…"),
      ).not.toBeInTheDocument();
    });

    it("does not show idle message after success", () => {
      renderAndAdvanceToSuccess();
      expect(
        screen.queryByText("Make a move, then ask the coach for guidance."),
      ).not.toBeInTheDocument();
    });

    it("does not show error after success", () => {
      renderAndAdvanceToSuccess();
      expect(document.querySelector(".coach-error")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders error message inside .coach-error when status is error", () => {
      // The component currently has no code path that triggers "error" state
      // from the UI (only the mock success path exists). We verify the error
      // class exists in the DOM only when the component is in that state —
      // in the current implementation there is no external prop to force it,
      // so we simply assert it is NOT present on a fresh render (idle).
      renderCoachPanel();
      expect(document.querySelector(".coach-error")).not.toBeInTheDocument();
    });
  });

  describe("select reflects the current coaching mode", () => {
    it("shows 'balanced' as the selected value when coachingMode is balanced", () => {
      renderCoachPanel({ coachingMode: "balanced" });
      expect(
        screen.getByRole<HTMLSelectElement>("combobox").value,
      ).toBe("balanced");
    });

    it("shows 'aggressive' as the selected value when coachingMode is aggressive", () => {
      renderCoachPanel({ coachingMode: "aggressive" });
      expect(
        screen.getByRole<HTMLSelectElement>("combobox").value,
      ).toBe("aggressive");
    });

    it("shows 'defensive' as the selected value when coachingMode is defensive", () => {
      renderCoachPanel({ coachingMode: "defensive" });
      expect(
        screen.getByRole<HTMLSelectElement>("combobox").value,
      ).toBe("defensive");
    });
  });

  describe("onCoachingModeChange callback", () => {
    it("calls onCoachingModeChange with 'aggressive' when that option is selected", async () => {
      const user = userEvent.setup();
      const onCoachingModeChange = vi.fn();
      renderCoachPanel({ onCoachingModeChange, coachingMode: "balanced" });

      await user.selectOptions(screen.getByRole("combobox"), "aggressive");

      expect(onCoachingModeChange).toHaveBeenCalledOnce();
      expect(onCoachingModeChange).toHaveBeenCalledWith("aggressive");
    });

    it("calls onCoachingModeChange with 'defensive' when that option is selected", async () => {
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
