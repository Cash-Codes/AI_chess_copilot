import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../app.js";

const validBody = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moveHistory: ["e4", "e5"],
  lastOpponentMove: "e5",
  sideToMove: "white",
  coachingMode: "balanced",
};

describe("POST /api/coach/analyze", () => {
  // --- 200 success cases ---

  it("returns 200 and a full CoachAnalyzeResponse for a valid body", async () => {
    const res = await request(app).post("/api/coach/analyze").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("recommendedMove");
    expect(typeof res.body.recommendedMove).toBe("string");
    expect(res.body).toHaveProperty("alternativeMoves");
    expect(Array.isArray(res.body.alternativeMoves)).toBe(true);
    expect(res.body).toHaveProperty("summary");
    expect(typeof res.body.summary).toBe("string");
    expect(res.body).toHaveProperty("reasoning");
    expect(Array.isArray(res.body.reasoning)).toBe(true);
    expect(res.body).toHaveProperty("risks");
    expect(Array.isArray(res.body.risks)).toBe(true);
    expect(res.body.confidence).toBe("medium");
    expect(res.body.style).toBe("balanced");
  });

  it("returns 200 with style 'aggressive' when coachingMode is aggressive", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "aggressive" });

    expect(res.status).toBe(200);
    expect(res.body.style).toBe("aggressive");
    expect(res.body.recommendedMove).toBe("d4");
  });

  it("returns 200 with style 'defensive' when coachingMode is defensive", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "defensive" });

    expect(res.status).toBe(200);
    expect(res.body.style).toBe("defensive");
    expect(res.body.recommendedMove).toBe("Bc4");
  });

  it("returns 200 when sideToMove is 'black'", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, sideToMove: "black" });

    expect(res.status).toBe(200);
  });

  it("returns 200 when moveHistory is an empty array", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, moveHistory: [] });

    expect(res.status).toBe(200);
  });

  // --- 400 validation failure cases ---

  it("returns 400 with error and details when body is empty", async () => {
    const res = await request(app).post("/api/coach/analyze").send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body).toHaveProperty("details");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("returns 400 when fen is missing, with 'fen' in error details", async () => {
    const { fen: _omit, ...body } = validBody;
    const res = await request(app).post("/api/coach/analyze").send(body);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("details");
    const fields: string[] = res.body.details.map((e: { field: string }) => e.field);
    expect(fields).toContain("fen");
  });

  it("returns 400 when fen is an empty string", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, fen: "" });

    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map((e: { field: string }) => e.field);
    expect(fields).toContain("fen");
  });

  it("returns 400 when moveHistory is not an array", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, moveHistory: "e4 e5" });

    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map((e: { field: string }) => e.field);
    expect(fields).toContain("moveHistory");
  });

  it("returns 400 when lastOpponentMove is missing", async () => {
    const { lastOpponentMove: _omit, ...body } = validBody;
    const res = await request(app).post("/api/coach/analyze").send(body);

    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map((e: { field: string }) => e.field);
    expect(fields).toContain("lastOpponentMove");
  });

  it("returns 400 when sideToMove is an invalid enum value", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, sideToMove: "purple" });

    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map((e: { field: string }) => e.field);
    expect(fields).toContain("sideToMove");
  });

  it("returns 400 when coachingMode is an invalid enum value", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "chaotic" });

    expect(res.status).toBe(400);
    const fields: string[] = res.body.details.map((e: { field: string }) => e.field);
    expect(fields).toContain("coachingMode");
  });

  it("returns 400 when the request body is sent as plain text (no JSON parse)", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .set("Content-Type", "text/plain")
      .send("not json");

    expect(res.status).toBe(400);
  });

  it("includes both 'error' string and 'details' array in 400 responses", async () => {
    const res = await request(app)
      .post("/api/coach/analyze")
      .send({ ...validBody, coachingMode: "unknown" });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});
