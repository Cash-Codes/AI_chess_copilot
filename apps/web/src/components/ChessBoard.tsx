import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => boolean;
}

export function ChessBoard({ fen, onMove }: ChessBoardProps) {
  return (
    <div className="board-wrapper">
      <Chessboard
        options={{
          position: fen,
          // TODO: Pawn promotion silently defaults to queen. Wire up
          // onPromotionPieceSelect (and optionally onPromotionCheck) from
          // react-chessboard v5 to show a promotion picker dialog instead.
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            return onMove(sourceSquare, targetSquare);
          },
          darkSquareStyle: { backgroundColor: "#b58863" },
          lightSquareStyle: { backgroundColor: "#f0d9b5" },
          boardStyle: {
            borderRadius: "4px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          },
        }}
      />
    </div>
  );
}
