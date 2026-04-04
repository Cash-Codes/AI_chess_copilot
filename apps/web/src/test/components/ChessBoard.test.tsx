import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChessBoard } from "../../components/ChessBoard";

// Capture the last options passed to the mocked Chessboard so individual tests
// can inspect or exercise onPieceDrop.
type BoardOptions = {
  position: string;
  onPieceDrop?: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
  darkSquareStyle?: Record<string, string>;
  lightSquareStyle?: Record<string, string>;
  boardStyle?: Record<string, string>;
};

let lastOptions: BoardOptions | null = null;

vi.mock("react-chessboard", () => ({
  Chessboard: ({ options }: { options: BoardOptions }) => {
    lastOptions = options;
    return (
      <div
        data-testid="mock-chessboard"
        data-position={options.position}
        data-has-on-piece-drop={String(typeof options.onPieceDrop === "function")}
      />
    );
  },
}));

describe("ChessBoard", () => {
  const INITIAL_FEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  beforeEach(() => {
    lastOptions = null;
  });

  it("renders a board wrapper element", () => {
    const { container } = render(
      <ChessBoard fen={INITIAL_FEN} onMove={vi.fn()} />,
    );
    expect(container.querySelector(".board-wrapper")).toBeInTheDocument();
  });

  it("renders the inner Chessboard component", () => {
    render(<ChessBoard fen={INITIAL_FEN} onMove={vi.fn()} />);
    expect(screen.getByTestId("mock-chessboard")).toBeInTheDocument();
  });

  it("passes the FEN position string down to the Chessboard", () => {
    render(<ChessBoard fen={INITIAL_FEN} onMove={vi.fn()} />);
    expect(screen.getByTestId("mock-chessboard")).toHaveAttribute(
      "data-position",
      INITIAL_FEN,
    );
  });

  it("passes an onPieceDrop handler to the Chessboard", () => {
    render(<ChessBoard fen={INITIAL_FEN} onMove={vi.fn()} />);
    expect(screen.getByTestId("mock-chessboard")).toHaveAttribute(
      "data-has-on-piece-drop",
      "true",
    );
  });

  it("updates the position when a different FEN prop is provided", () => {
    const afterE4Fen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    render(<ChessBoard fen={afterE4Fen} onMove={vi.fn()} />);
    expect(screen.getByTestId("mock-chessboard")).toHaveAttribute(
      "data-position",
      afterE4Fen,
    );
  });
});

describe("ChessBoard onPieceDrop wiring", () => {
  const INITIAL_FEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  beforeEach(() => {
    lastOptions = null;
  });

  it("calls onMove with sourceSquare and targetSquare when a piece is dropped", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={INITIAL_FEN} onMove={onMove} />);

    // lastOptions is populated by the mock during render
    expect(lastOptions).not.toBeNull();
    lastOptions!.onPieceDrop!({ sourceSquare: "e2", targetSquare: "e4" });

    expect(onMove).toHaveBeenCalledWith("e2", "e4");
  });

  it("returns true from onPieceDrop when onMove returns true", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={INITIAL_FEN} onMove={onMove} />);

    const result = lastOptions!.onPieceDrop!({
      sourceSquare: "e2",
      targetSquare: "e4",
    });
    expect(result).toBe(true);
  });

  it("returns false from onPieceDrop when targetSquare is null", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={INITIAL_FEN} onMove={onMove} />);

    const result = lastOptions!.onPieceDrop!({
      sourceSquare: "e2",
      targetSquare: null,
    });

    expect(result).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("does not call onMove when targetSquare is null", () => {
    const onMove = vi.fn();
    render(<ChessBoard fen={INITIAL_FEN} onMove={onMove} />);

    lastOptions!.onPieceDrop!({ sourceSquare: "e2", targetSquare: null });

    expect(onMove).not.toHaveBeenCalled();
  });
});
