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

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate with Google Cloud

The API uses Vertex AI (Gemini) via [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials). You need the `gcloud` CLI installed and a GCP project with the Vertex AI API enabled.

```bash
# Install gcloud CLI (if not already installed)
# https://cloud.google.com/sdk/docs/install

# Log in and set up ADC
gcloud auth login
gcloud auth application-default login

# Set your active project
gcloud config set project YOUR_GCP_PROJECT_ID

# Enable the Vertex AI API on your project (one-time)
gcloud services enable aiplatform.googleapis.com
```

ADC means no API key file is needed locally — the SDK picks up your credentials automatically.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set `VERTEX_PROJECT` to your GCP project ID:

```
VERTEX_PROJECT=your-gcp-project-id   # required to enable real model calls
VERTEX_LOCATION=us-central1          # optional, defaults to us-central1
VERTEX_MODEL=gemini-2.0-flash-001    # optional, defaults to gemini-2.0-flash-001
```

**Without `VERTEX_PROJECT`** the API falls back to mock responses — no GCP account needed for local frontend development.

### 4. Run both apps

```bash
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001

## Testing

Tests use [Vitest](https://vitest.dev/) across both apps.

```bash
# Run all tests (web + api)
npm test

# Run individually
npm run test:web
npm run test:api

# Watch mode
npm --workspace apps/web run test:watch
npm --workspace apps/api run test:watch
```

Both test suites run in parallel on every pull request via GitHub Actions (see `.github/workflows/ci.yml`).

## Environment variables

| Variable          | Default                 | Description                                           |
| ----------------- | ----------------------- | ----------------------------------------------------- |
| `VITE_API_URL`    | `http://localhost:3001` | Backend URL consumed by the frontend via Vite         |
| `PORT`            | `3001`                  | API listen port                                       |
| `CORS_ORIGIN`     | `http://localhost:5173` | Allowed frontend origin for CORS                      |
| `VERTEX_PROJECT`  | —                       | GCP project ID — **required** to enable real AI calls |
| `VERTEX_LOCATION` | `us-central1`           | GCP region for Vertex AI                              |
| `VERTEX_MODEL`    | `gemini-2.0-flash-001`  | Gemini model ID                                       |

Authentication is handled by [ADC](https://cloud.google.com/docs/authentication/application-default-credentials) — run `gcloud auth application-default login` once. No API key file required.

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
