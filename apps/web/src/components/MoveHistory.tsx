interface MoveHistoryProps {
  moves: string[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="move-history">
      <div className="panel-label">MOVES</div>
      <div className="move-list">
        {pairs.length === 0 ? (
          <span className="move-list-empty">No moves yet.</span>
        ) : (
          pairs.map(([white, black], i) => (
            <div key={i} className="move-pair">
              <span className="move-number">{i + 1}.</span>
              <span className="move">{white}</span>
              {black !== undefined && <span className="move">{black}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
