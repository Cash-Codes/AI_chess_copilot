import { Router } from "express";
import { validateCoachRequest } from "../validation/coachRequest.js";
import { buildMockResponse } from "../services/mockCoach.js";

export const coachRouter = Router();

coachRouter.post("/analyze", (req, res) => {
  const result = validateCoachRequest(req.body);

  if (!result.ok) {
    res.status(400).json({
      error: "Invalid request.",
      details: result.errors,
    });
    return;
  }

  const response = buildMockResponse(result.data);
  res.json(response);
});
