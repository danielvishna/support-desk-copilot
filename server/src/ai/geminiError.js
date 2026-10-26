/**
 * @fileoverview Classifies errors thrown by the Gemini client into a
 * user-facing message and a retry decision, so the route handler and the
 * retry logic share one source of truth instead of guessing independently.
 */

/**
 * A classified Gemini API failure.
 * @typedef {Object} ClassifiedGeminiError
 * @property {string} userMessage Safe to show directly to the end user.
 * @property {boolean} retryable Whether retrying the same request is worth
 *     attempting (transient server-side condition) as opposed to doomed to
 *     fail again (bad key, bad request).
 */

/**
 * Parses the JSON error body the Gemini REST API returns on failure.
 * @param {string} rawMessage The `Error#message` thrown by the SDK.
 * @return {{code: number|undefined, status: string|undefined,
 *     reason: string|undefined}|null} The parsed `code`/`status`/`reason`
 *     (e.g. `API_KEY_INVALID`), or null if `rawMessage` isn't the expected
 *     `{"error": {...}}` JSON shape (e.g. an AbortError's plain message).
 */
function parseApiErrorBody(rawMessage) {
  try {
    const parsed = JSON.parse(rawMessage)
    if (!parsed?.error) return null
    const reason = parsed.error.details?.find((d) => d.reason)?.reason
    return { code: parsed.error.code, status: parsed.error.status, reason }
  } catch {
    return null
  }
}

/**
 * Classifies an error thrown by {@link callGeminiJson} into a message safe
 * to show the user and whether the request is worth retrying.
 * @param {string} rawMessage The `Error#message` thrown by the SDK, or the
 *     AbortSignal timeout's "This operation was aborted".
 * @return {ClassifiedGeminiError}
 */
export function classifyGeminiError(rawMessage) {
  const body = parseApiErrorBody(rawMessage)

  if (!body) {
    // Not the Gemini REST JSON shape - our own request timeout produces a
    // plain "This operation was aborted" message.
    return {
      userMessage: 'The AI request took too long and was cancelled. This is usually temporary - try again in a moment.',
      retryable: true,
    }
  }

  if (body.code === 401 || body.code === 403 || body.reason === 'API_KEY_INVALID') {
    return {
      userMessage: 'Your Gemini API key was rejected. Double-check the key and try again.',
      retryable: false,
    }
  }
  if (body.code === 429) {
    return {
      userMessage: "You've hit the Gemini rate limit for this key. Wait a moment and try again.",
      retryable: true,
    }
  }
  if (body.code === 503 || body.status === 'UNAVAILABLE') {
    return {
      userMessage: 'The Gemini model is temporarily overloaded on Google\'s side. This usually clears up within a minute or two - try again shortly.',
      retryable: true,
    }
  }
  if (body.code === 404) {
    return {
      userMessage: 'The configured Gemini model is not available for this API key.',
      retryable: false,
    }
  }

  return {
    userMessage: 'The AI provider returned an unexpected error. Try again, and check your key and quota if it keeps happening.',
    retryable: false,
  }
}
