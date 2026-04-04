import express from "express";
import cors from "cors";
import { coachRouter } from "./routes/coach.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/coach", coachRouter);

export { app };
