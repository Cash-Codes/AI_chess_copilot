import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateCoachRequest } from "../validation/coachRequest.js";
import {
  streamMockResponse,
  streamResponseAsNdjson,
} from "../services/mockCoach.js";
import { orchestrateCoachResponse } from "../services/coachOrchestrator.js";
import { getVertexConfig } from "../services/modelClient.js";

export const coachRouter = Router();

const analyzeLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Too many requests. Please wait a moment and try again." },
});

coachRouter.post("/analyze", analyzeLimiter, async (req, res) => {
  const result = validateCoachRequest(req.body);

  if (!result.ok) {
    res.status(400).json({
      error: "Invalid request.",
      details: result.errors,
    });
    return;
  }

  // Use the real model when VERTEX_PROJECT is configured; otherwise use mock.
  if (getVertexConfig()) {
    let response = null;
    try {
      response = await orchestrateCoachResponse(result.data);
    } catch (err) {
      console.error("[coach] Model error, falling back to mock:", err);
    }
    if (response) {
      await streamResponseAsNdjson(response, res);
      return;
    }
  }

  await streamMockResponse(result.data, res);
});
