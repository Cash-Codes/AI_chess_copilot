import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { coachRouter } from "./routes/coach.js";

const app = express();

// In production the frontend is served from the same origin, so CORS is only
// needed in local dev (where web runs on a separate port).
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
}

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/coach", coachRouter);

// Production: serve the built Vite frontend and fall back to index.html for
// client-side routing. This block is skipped entirely in local development.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // From apps/api/dist/ the web build is two levels up then into apps/web/dist
  const webDist = path.resolve(__dirname, "../../web/dist");

  app.use(express.static(webDist));

  app.get("{*path}", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

export { app };
