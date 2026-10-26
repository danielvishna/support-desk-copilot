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
 * Reply drafts take longer to generate than a triage classification.
 * @const {number}
 */
const STREAM_TIMEOUT_MS = 60_000

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

/**
 * Streams free-form text from Gemini (no JSON schema - used for reply
 * drafts, not triage). Yields text as it arrives so the caller can forward
 * chunks to an HTTP response as they come in.
 * @param {Object} args
 * @param {string} args.apiKey
 * @param {string} args.systemInstruction
 * @param {!Array<Object>} args.contents
 * @param {AbortSignal=} args.callerSignal Aborted when the client cancels
 *     (Stop button / disconnect) - combined with our own safety timeout so
 *     either one can end the upstream request.
 * @return {AsyncGenerator<string>}
 * @throws {Error} If the request fails or is aborted; route this through
 *     ai/geminiError.js before showing it to the user.
 */
export async function* streamGeminiText({ apiKey, systemInstruction, contents, callerSignal }) {
  const ai = new GoogleGenAI({ apiKey })
  const timeoutSignal = AbortSignal.timeout(STREAM_TIMEOUT_MS)
  const abortSignal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents,
    config: { systemInstruction, abortSignal },
  })

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}
