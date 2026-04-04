import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachPanel } from "../../components/CoachPanel";
import type { CoachingMode } from "../../hooks/useGameState";

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
  describe("static content", () => {
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
      expect(
        screen.getByRole("option", { name: "aggressive" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "defensive" }),
      ).toBeInTheDocument();
    });
  });

  describe("Ask Coach button disabled/enabled state", () => {
    it("disables the Ask Coach button when canAsk is false", () => {
      renderCoachPanel({ canAsk: false });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeDisabled();
    });

    it("enables the Ask Coach button when canAsk is true", () => {
      renderCoachPanel({ canAsk: true });
      expect(screen.getByRole("button", { name: "Ask Coach" })).toBeEnabled();
    });
  });

  describe("select reflects the current coaching mode", () => {
    it("shows 'balanced' as the selected value when coachingMode is balanced", () => {
      renderCoachPanel({ coachingMode: "balanced" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe(
        "balanced",
      );
    });

    it("shows 'aggressive' as the selected value when coachingMode is aggressive", () => {
      renderCoachPanel({ coachingMode: "aggressive" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe(
        "aggressive",
      );
    });

    it("shows 'defensive' as the selected value when coachingMode is defensive", () => {
      renderCoachPanel({ coachingMode: "defensive" });
      expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe(
        "defensive",
      );
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
