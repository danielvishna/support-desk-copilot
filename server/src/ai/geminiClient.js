import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-3.1-flash-lite'

// The SDK call has no built-in timeout - a slow/stuck upstream request would
// otherwise hang the handler (and the free-host request) indefinitely.
const REQUEST_TIMEOUT_MS = 20_000

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
