import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/analyze-position", (req, res) => {
  const { fen, pgn } = req.body ?? {};
  res.json({
    message: "Analysis endpoint placeholder",
    received: { fen, pgn },
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
