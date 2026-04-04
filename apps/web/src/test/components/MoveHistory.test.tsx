import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoveHistory } from "../../components/MoveHistory";

describe("MoveHistory", () => {
  describe("empty state", () => {
    it("renders the MOVES panel label", () => {
      render(<MoveHistory moves={[]} />);
      expect(screen.getByText("MOVES")).toBeInTheDocument();
    });

    it("shows an empty-state message when there are no moves", () => {
      render(<MoveHistory moves={[]} />);
      expect(screen.getByText("No moves yet.")).toBeInTheDocument();
    });

    it("does not render any move pairs when the list is empty", () => {
      const { container } = render(<MoveHistory moves={[]} />);
      expect(container.querySelectorAll(".move-pair")).toHaveLength(0);
    });
  });

  describe("with moves", () => {
    it("does not show the empty-state message once moves exist", () => {
      render(<MoveHistory moves={["e4"]} />);
      expect(screen.queryByText("No moves yet.")).not.toBeInTheDocument();
    });

    it("renders a single move pair for one move", () => {
      const { container } = render(<MoveHistory moves={["e4"]} />);
      expect(container.querySelectorAll(".move-pair")).toHaveLength(1);
    });

    it("displays the move number '1.' for the first pair", () => {
      render(<MoveHistory moves={["e4"]} />);
      expect(screen.getByText("1.")).toBeInTheDocument();
    });

    it("shows the white move text", () => {
      render(<MoveHistory moves={["e4"]} />);
      expect(screen.getByText("e4")).toBeInTheDocument();
    });

    it("renders two move pairs for four moves", () => {
      const { container } = render(
        <MoveHistory moves={["e4", "e5", "Nf3", "Nc6"]} />,
      );
      expect(container.querySelectorAll(".move-pair")).toHaveLength(2);
    });

    it("displays both white and black moves in a full pair", () => {
      render(<MoveHistory moves={["e4", "e5"]} />);
      expect(screen.getByText("e4")).toBeInTheDocument();
      expect(screen.getByText("e5")).toBeInTheDocument();
    });

    it("shows move number '2.' for the second pair", () => {
      render(<MoveHistory moves={["e4", "e5", "Nf3", "Nc6"]} />);
      expect(screen.getByText("2.")).toBeInTheDocument();
    });

    it("handles an odd number of moves (white move without a black reply)", () => {
      const { container } = render(
        <MoveHistory moves={["e4", "e5", "Nf3"]} />,
      );
      // Two pairs: first complete, second has only white
      expect(container.querySelectorAll(".move-pair")).toHaveLength(2);
      expect(screen.getByText("Nf3")).toBeInTheDocument();
    });

    it("renders all move numbers in sequence for a longer game", () => {
      const moves = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"];
      render(<MoveHistory moves={moves} />);
      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("2.")).toBeInTheDocument();
      expect(screen.getByText("3.")).toBeInTheDocument();
    });

    it("displays all move texts for a six-move sequence", () => {
      const moves = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"];
      render(<MoveHistory moves={moves} />);
      for (const move of moves) {
        expect(screen.getByText(move)).toBeInTheDocument();
      }
    });
  });
});
