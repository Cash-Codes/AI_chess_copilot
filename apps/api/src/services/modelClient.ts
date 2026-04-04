import { VertexAI, SchemaType } from "@google-cloud/vertexai";
import type { Schema, GenerativeModel } from "@google-cloud/vertexai";

export { SchemaType };
export type { Schema };

/**
 * Returns VertexAI config from environment variables.
 * Returns null when VERTEX_PROJECT is not set — the route layer uses this
 * to decide whether to use the real model or fall back to mock.
 */
export function getVertexConfig(): {
  project: string;
  location: string;
  model: string;
} | null {
  const project = process.env.VERTEX_PROJECT;
  if (!project) return null;
  return {
    project,
    location: process.env.VERTEX_LOCATION ?? "us-central1",
    model: process.env.VERTEX_MODEL ?? "gemini-2.5-flash",
  };
}

let _generativeModel: GenerativeModel | null = null;

function getCachedModel(): GenerativeModel {
  if (_generativeModel) return _generativeModel;
  const config = getVertexConfig()!;
  const vertexAI = new VertexAI({
    project: config.project,
    location: config.location,
  });
  _generativeModel = vertexAI.getGenerativeModel({ model: config.model });
  return _generativeModel;
}

/**
 * Sends a prompt to the configured Gemini model and returns a structured
 * JSON response validated against the provided schema.
 *
 * Throws on network failure, empty response, or JSON parse error.
 * The caller is responsible for fallback handling.
 */
export async function generateStructuredResponse<T>(
  prompt: string,
  schema: Schema,
): Promise<T> {
  const config = getVertexConfig();
  if (!config) throw new Error("VERTEX_PROJECT is not configured.");

  const result = await getCachedModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text.trim()) throw new Error("Empty response from model.");

  return JSON.parse(text) as T;
}
