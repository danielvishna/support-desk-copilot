/**
 * @fileoverview Thin wrapper around the Gemini SDK. Isolated here so routes
 * never talk to the SDK directly (see CLAUDE.md's AI-logic separation rule)
 * and so the model name, timeout, and JSON-mode config live in one place.
 */

import { GoogleGenAI } from '@google/genai'

/** @const {string} */
const MODEL = 'gemini-3.1-flash-lite'

/**
 * The SDK call has no built-in timeout - a slow/stuck upstream request
 * would otherwise hang the handler (and the free-host request) indefinitely.
 * @const {number}
 */
const REQUEST_TIMEOUT_MS = 20_000

/**
 * Calls Gemini and asks it to return JSON matching `responseSchema`.
 * @param {Object} args
 * @param {string} args.apiKey Caller-supplied Gemini API key.
 * @param {string} args.systemInstruction System prompt for the request.
 * @param {!Array<Object>} args.contents Gemini `contents` array (see
 *     ai/triagePrompt.js for how this is built).
 * @param {Object} args.responseSchema JSON schema the model's output must
 *     conform to (Gemini enforces this at generation time).
 * @return {Promise<string>} The raw JSON text returned by the model. The
 *     caller is still responsible for validating it (never trust it as-is -
 *     see validation/triageResultSchema.js).
 * @throws {Error} If the request fails or times out after
 *     {@link REQUEST_TIMEOUT_MS}; callers should route this through
 *     ai/geminiError.js to get a user-facing message.
 */
export async function callGeminiJson({ apiKey, systemInstruction, contents, responseSchema }) {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema,
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  })

  return response.text
}
