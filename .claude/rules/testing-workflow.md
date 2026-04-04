# Testing workflow

After any development work (new features, bug fixes, refactors), always create or update tests using the `test-automator` agent before considering the task done.

- Dispatch a subagent using the instructions in `~/.claude/agents/test-automator.md`
- Tests live in `apps/web/src/test/` — Vitest + React Testing Library
- Run `npm run test --workspace=apps/web -- --run` to confirm all pass
- If a behaviour change breaks existing tests, update the tests to match the new behaviour — do not revert the code
