export type AnalyzePositionRequest = {
  fen?: string;
  pgn?: string;
};

export type AnalyzePositionResponse = {
  message: string;
  received: {
    fen?: string;
    pgn?: string;
  };
};
