# AI Chess Copilot

A thin, polished AI copilot for chess that demonstrates real-time coaching, LLM orchestration and full-stack product execution.

The user plays chess in the browser. After the opponent moves, they click **Ask Coach** to get a streamed AI response with a recommended move, alternatives, reasoning and risks — in a chosen coaching style.

## Architecture

npm workspaces monorepo:

```
apps/
  web/      React + TypeScript frontend (Vite, port 5173)
  api/      Express 5 backend (TypeScript via tsx, port 3001)
packages/
  shared/   Shared TypeScript types (@ai-chess-copilot/shared)
```

**Frontend modules** (`apps/web/src/`):

- `ChessBoard` — interactive board, legal move enforcement, FEN state
- `CoachPanel` — displays streaming AI response, coaching mode selector
- `MoveHistory` — scrollable move list
- `useGameState` — board state, move tracking, opponent detection
- `useCoachRequest` — sends position to API, handles streaming response

**Backend modules** (`apps/api/src/`):

- `routes/coach.ts` — `POST /api/coach/analyze` handler
- `services/chessContext.ts` — normalizes FEN, move history, side to move
- `services/coachOrchestrator.ts` — multi-stage prompt pipeline
- `services/modelClient.ts` — Claude API streaming client
- `types/coach.ts` — request/response schema validation

**Orchestration pipeline** (5 stages):

1. Input normalization — validate and compact the game context
2. Position summarization — phase, key tensions, development themes
3. Candidate move generation — practical options for the position
4. Coaching explanation — best move, alternatives, reasoning, risks
5. Response shaping — validate JSON schema; retry or fallback on failure

## API

`POST /api/coach/analyze`

```json
// Request
{
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2",
  "moveHistory": ["e4", "e5"],
  "lastOpponentMove": "e5",
  "sideToMove": "white",
  "coachingMode": "balanced"
}

// Response
{
  "recommendedMove": "Nf3",
  "alternativeMoves": ["Bc4", "d4"],
  "summary": "Develop a piece, contest the center, and keep flexible options.",
  "reasoning": ["Nf3 develops naturally and pressures the center.", "..."],
  "risks": ["Don't overextend with too many pawn pushes before development."],
  "confidence": "medium",
  "style": "balanced"
}
```

Coaching modes: `balanced` | `aggressive` | `defensive` — influence prompt style only.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Run both apps
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001

## Testing

Tests live in `apps/web/src/test/` and use [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/).

```bash
# Run tests once
npm run test --workspace=apps/web

# Watch mode (re-runs on file changes)
npm run test:watch --workspace=apps/web
```

Tests run automatically on every pull request via GitHub Actions (see `.github/workflows/ci.yml`).

## Environment variables

| Variable            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `VITE_API_URL`      | Backend URL (default: `http://localhost:3001`)             |
| `PORT`              | API listen port (default: `3001`)                          |
| `CORS_ORIGIN`       | Allowed frontend origin (default: `http://localhost:5173`) |
| `ANTHROPIC_API_KEY` | Required — Claude API key                                  |

## V1 trade-offs

**Intentionally excluded from V1:**

- Authentication, persistent accounts, database
- RAG, vector storage, retrieval over openings/tactics
- WebSocket / WebRTC (SSE streaming is sufficient for V1)
- Multiplayer, OCR, mobile optimization, deployment infra

**Why:** V1 targets the copilot layer — real-time AI assistance, orchestration quality and product clarity.

## Future (V2+)

- Voice input and richer real-time interaction (WebRTC)
- Persistent session history and player profiling
- Retrieval over openings, tactics, prior games
- Frame-based visual understanding for games without exposed state
- Multimodal support
