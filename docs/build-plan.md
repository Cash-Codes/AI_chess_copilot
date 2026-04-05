# V1 Build Plan

Milestone-based implementation plan

Each milestone is independently shippable. Start the next only when the current one works end-to-end.

---

## M0 — Monorepo scaffold & shared types

**Goal:** Repo compiles. Shared types importable from both apps.

- [ ] Root `package.json` with npm workspaces (`apps/*`, `packages/*`)
- [ ] `packages/shared/` — `CoachAnalyzeRequest`, `CoachAnalyzeResponse`, `CoachingMode`, `SideToMove`, `Confidence` types
- [ ] `apps/api/` — Express 5 + tsx, `GET /health` returns 200
- [ ] `apps/web/` — Vite + React + TypeScript, renders "Hello"
- [ ] `npm run dev` starts both concurrently
- [ ] ESLint + Prettier configured (matches CLAUDE.md code style)
- [ ] `.env.example` updated with `ANTHROPIC_API_KEY`

**Done when:** `npm run dev` works, `npm run lint` passes, shared types import cleanly.

---

## M1 — Chessboard UI

**Goal:** User can play a full legal game in the browser.

- [ ] Install a chess library (e.g. `chess.js` for logic, `react-chessboard` for rendering)
- [ ] `useGameState` hook — FEN, move history, side to move, last opponent move
- [ ] `ChessBoard` component — interactive board with legal move enforcement
- [ ] `MoveHistory` component — scrollable algebraic notation list
- [ ] Board state persists across moves; FEN updates correctly

**Done when:** Both sides can play a legal game to checkmate; FEN and move history are accurate throughout.

---

## M2 — Backend coach endpoint

**Goal:** `POST /api/coach/analyze` returns a valid `CoachAnalyzeResponse`.

- [ ] `types/coach.ts` — Zod (or manual) schema for request validation
- [ ] `services/chessContext.ts` — normalizes and validates incoming game context
- [ ] `services/modelClient.ts` — calls Claude API, returns raw response
- [ ] `services/coachOrchestrator.ts` — 5-stage pipeline (normalize → summarize → candidates → explain → shape)
- [ ] `routes/coach.ts` — wires validation → orchestrator → response
- [ ] Prompt instructs model: concise coach, strict JSON only, no verbosity
- [ ] Schema validation on model output; retry once on malformed JSON; fallback error response

**Done when:** `curl` against the endpoint with a valid FEN returns a well-formed `CoachAnalyzeResponse`.

---

## M3 — Ask Coach flow with streaming

**Goal:** User clicks Ask Coach; streamed response appears in the side panel.

- [ ] `useCoachRequest` hook — POST to API, handles loading / streaming / error states
- [ ] API route supports SSE or streamed JSON chunks
- [ ] `CoachPanel` component — idle / loading / success / error states
  - Idle: "Make a move, then ask the coach for guidance."
  - Loading: "Analyzing position…"
  - Success: recommended move, alternatives, reasoning, risks, confidence badge
  - Error: "Couldn't analyze that position. Please try again."
- [ ] Two-column layout: chessboard left, coach panel right
- [ ] Ask Coach button sends current FEN, move history, last opponent move, side to move

**Done when:** Full ask-coach flow works locally; response streams in and panel renders all fields correctly.

---

## M4 — Coaching modes & optional voice

**Goal:** Three coaching styles; optional read-aloud.

- [ ] Coaching mode selector in coach panel (`balanced` / `aggressive` / `defensive`)
- [ ] Selected mode sent in request; orchestrator adjusts prompt style accordingly
- [ ] Confirm visibly different response character between modes (sharper vs. safer language)
- [ ] Optional: "Read Aloud" button using `window.speechSynthesis` on `summary` + `recommendedMove`
- [ ] Voice toggle persists across coach requests in session

**Done when:** Mode switch produces noticeably different coaching tone; voice reads the response aloud when enabled.

---

## M5 — Polish & demo-ready

**Goal:** V1 delivery checklist.

- [ ] UI is clean and minimal; no layout regressions at common viewport sizes
- [ ] Error handling is friendly (malformed model output, API unreachable)
- [ ] `npm run build:web` and `npm run build:api` succeed with no errors
- [ ] `npm run lint` passes clean
- [ ] README covers: overview, architecture, setup, trade-offs, future enhancements

**Done when:** Demo script runs cleanly; README is accurate; lint and build pass.

---

## Out of scope for V1

Anything not listed above is explicitly deferred:

- Auth, accounts, sessions, database
- WebRTC, WebSocket
- RAG, vector storage, retrieval
- OCR / computer vision
- Mobile optimization
- Deployment infra
- Test framework setup
