import { describe, it, expect } from "vitest";
import { validateCoachRequest } from "../../validation/coachRequest.js";

const validBody = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moveHistory: ["e4", "e5"],
  lastOpponentMove: "e5",
  sideToMove: "white",
  coachingMode: "balanced",
};

describe("validateCoachRequest", () => {
  it("returns ok:true with typed data for a fully valid payload", () => {
    const result = validateCoachRequest(validBody);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fen).toBe(validBody.fen);
      expect(result.data.moveHistory).toEqual(validBody.moveHistory);
      expect(result.data.lastOpponentMove).toBe(validBody.lastOpponentMove);
      expect(result.data.sideToMove).toBe("white");
      expect(result.data.coachingMode).toBe("balanced");
    }
  });

  it("accepts an empty moveHistory array", () => {
    const result = validateCoachRequest({ ...validBody, moveHistory: [] });
    expect(result.ok).toBe(true);
  });

  it("ignores extra fields not in the schema", () => {
    const result = validateCoachRequest({ ...validBody, extraField: "ignored" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.data as Record<string, unknown>).extraField).toBeUndefined();
    }
  });

  // --- body-level failures ---

  it("returns ok:false when body is null", () => {
    const result = validateCoachRequest(null);
    expect(result.ok).toBe(false);
  });

  it("returns ok:false when body is not an object", () => {
    const result = validateCoachRequest("not-an-object");
    expect(result.ok).toBe(false);
  });

  // --- fen ---

  it("returns ok:false with field 'fen' when fen is missing", () => {
    const { fen: _omit, ...rest } = validBody;
    const result = validateCoachRequest(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "fen")).toBe(true);
    }
  });

  it("returns ok:false with field 'fen' when fen is an empty string", () => {
    const result = validateCoachRequest({ ...validBody, fen: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "fen")).toBe(true);
    }
  });

  it("returns ok:false with field 'fen' when fen is whitespace only", () => {
    const result = validateCoachRequest({ ...validBody, fen: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "fen")).toBe(true);
    }
  });

  it("returns ok:false with field 'fen' when fen is a number", () => {
    const result = validateCoachRequest({ ...validBody, fen: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "fen")).toBe(true);
    }
  });

  // --- moveHistory ---

  it("returns ok:false with field 'moveHistory' when moveHistory is missing", () => {
    const { moveHistory: _omit, ...rest } = validBody;
    const result = validateCoachRequest(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "moveHistory")).toBe(true);
    }
  });

  it("returns ok:false with field 'moveHistory' when moveHistory is a string", () => {
    const result = validateCoachRequest({ ...validBody, moveHistory: "e4 e5" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "moveHistory")).toBe(true);
    }
  });

  it("returns ok:false with field 'moveHistory' when moveHistory contains non-strings", () => {
    const result = validateCoachRequest({ ...validBody, moveHistory: ["e4", 5] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "moveHistory")).toBe(true);
    }
  });

  // --- lastOpponentMove ---

  it("returns ok:true with lastOpponentMove null when lastOpponentMove is missing", () => {
    const { lastOpponentMove: _omit, ...rest } = validBody;
    const result = validateCoachRequest(rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lastOpponentMove).toBeNull();
    }
  });

  it("returns ok:false with field 'lastOpponentMove' when lastOpponentMove is empty", () => {
    const result = validateCoachRequest({ ...validBody, lastOpponentMove: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "lastOpponentMove")).toBe(true);
    }
  });

  it("returns ok:false with field 'lastOpponentMove' when lastOpponentMove is whitespace only", () => {
    const result = validateCoachRequest({ ...validBody, lastOpponentMove: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "lastOpponentMove")).toBe(true);
    }
  });

  // --- sideToMove ---

  it("returns ok:false with field 'sideToMove' when sideToMove is missing", () => {
    const { sideToMove: _omit, ...rest } = validBody;
    const result = validateCoachRequest(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "sideToMove")).toBe(true);
    }
  });

  it("returns ok:false with field 'sideToMove' for an invalid enum value", () => {
    const result = validateCoachRequest({ ...validBody, sideToMove: "red" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "sideToMove")).toBe(true);
    }
  });

  it("accepts sideToMove 'black'", () => {
    const result = validateCoachRequest({ ...validBody, sideToMove: "black" });
    expect(result.ok).toBe(true);
  });

  // --- coachingMode ---

  it("returns ok:false with field 'coachingMode' when coachingMode is missing", () => {
    const { coachingMode: _omit, ...rest } = validBody;
    const result = validateCoachRequest(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "coachingMode")).toBe(true);
    }
  });

  it("returns ok:false with field 'coachingMode' for an invalid enum value", () => {
    const result = validateCoachRequest({ ...validBody, coachingMode: "reckless" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "coachingMode")).toBe(true);
    }
  });

  it("accepts coachingMode 'aggressive'", () => {
    const result = validateCoachRequest({ ...validBody, coachingMode: "aggressive" });
    expect(result.ok).toBe(true);
  });

  it("accepts coachingMode 'defensive'", () => {
    const result = validateCoachRequest({ ...validBody, coachingMode: "defensive" });
    expect(result.ok).toBe(true);
  });

  // --- multiple errors collected ---

  it("collects multiple field errors in a single pass", () => {
    const result = validateCoachRequest({
      fen: "",
      moveHistory: null,
      lastOpponentMove: 0,
      sideToMove: "purple",
      coachingMode: "chaotic",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("fen");
      expect(fields).toContain("moveHistory");
      expect(fields).toContain("lastOpponentMove");
      expect(fields).toContain("sideToMove");
      expect(fields).toContain("coachingMode");
    }
  });
});
