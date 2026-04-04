import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

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
    <div
      data-testid="mock-chessboard"
      data-position={options.position}
    />
  ),
}));

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
      expect(
        screen.getByRole("button", { name: "Ask Coach" }),
      ).toBeDisabled();
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
});
