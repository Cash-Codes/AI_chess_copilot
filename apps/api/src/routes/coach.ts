import { Router } from "express";
import { validateCoachRequest } from "../validation/coachRequest.js";
import {
  streamMockResponse,
  streamResponseAsNdjson,
} from "../services/mockCoach.js";
import { orchestrateCoachResponse } from "../services/coachOrchestrator.js";
import { getVertexConfig } from "../services/modelClient.js";

export const coachRouter = Router();

coachRouter.post("/analyze", async (req, res) => {
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
