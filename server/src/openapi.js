/**
 * @fileoverview OpenAPI 3.0 spec for the Support Desk Copilot API, served
 * as both raw JSON (GET /api/openapi.json) and an interactive Swagger UI
 * (GET /api/docs) from index.js. Kept as a plain JS object (not a .yaml
 * file + parser) to avoid an extra dependency for a three-route API, and
 * so it lives next to the routes it describes instead of drifting out of
 * sync in a separate format. Update this whenever a route's request/
 * response shape changes - it's documentation, not generated from the
 * code, so nothing enforces that it stays accurate except doing so.
 */

const TICKET_SCHEMA = {
  type: 'object',
  required: ['id', 'customer', 'subject', 'message'],
  properties: {
    id: { type: 'string', example: 'T-002' },
    customer: { type: 'string', maxLength: 200, example: 'Alex' },
    subject: { type: 'string', maxLength: 300, example: 'Cannot log in' },
    message: {
      type: 'string',
      maxLength: 4000,
      example: 'Our entire team cannot access the dashboard, and we have a customer demo in an hour.',
    },
  },
}

const ERROR_SCHEMA = {
  type: 'object',
  properties: {
    error: { type: 'string', description: 'User-facing message, safe to show as-is.' },
    retryable: { type: 'boolean', description: 'True if the same request is worth retrying (see ai/geminiError.js).' },
    ticketId: { type: 'string' },
    needsReview: { type: 'boolean', description: 'Set on triage failures - the ticket needs manual attention.' },
  },
}

/** @const {Object} */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Support Desk Copilot API',
    version: '1.0.0',
    description:
      'Classifies support tickets and drafts replies with Gemini. See CLAUDE.md for the ' +
      'architecture this API follows and DECISIONS.md for why things work the way they do. ' +
      'Every AI route takes the caller\'s Gemini key in the x-gemini-api-key header - it is ' +
      'never persisted or logged server-side.',
  },
  servers: [{ description: 'This server', url: '/' }],
  components: {
    securitySchemes: {
      geminiApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-gemini-api-key',
        description: 'Your own Gemini API key, sent per-request. Falls back to the server\'s GEMINI_API_KEY env var if omitted (local/dev only).',
      },
    },
    schemas: {
      Ticket: TICKET_SCHEMA,
      Error: ERROR_SCHEMA,
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Liveness check',
        responses: {
          200: {
            description: 'The server is up.',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } },
          },
        },
      },
    },
    '/api/triage': {
      post: {
        summary: 'Classify one ticket',
        description:
          'Returns priority, category, a one-sentence reason, and a "quote" - a short substring ' +
          'of the ticket message that the UI highlights as grounding for the decision. The server ' +
          'verifies the quote is an exact substring of the message before returning it non-empty ' +
          '(see validation/triageResultSchema.js isQuoteGrounded) - never trust it from the model alone.',
        security: [{ geminiApiKey: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } },
        },
        responses: {
          200: {
            description: 'Triage result.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ticketId: { type: 'string' },
                    priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
                    category: { type: 'string', enum: ['Billing', 'Technical', 'Feature Request', 'Other'] },
                    reason: { type: 'string' },
                    quote: { type: 'string', description: 'Verified exact substring of the ticket message, or "".' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid ticket body.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing API key.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          502: {
            description: 'The AI provider failed or returned something unusable, even after one retry.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/draft-reply': {
      post: {
        summary: 'Stream a reply draft for one ticket',
        description:
          'Streams the reply as plain text chunks (not JSON, not SSE) as Gemini generates it. ' +
          'Cancel the client fetch (the Stop button) to cancel the upstream model call too - see ' +
          'routes/draftReply.js for why res.on(\'close\'), not req.on(\'close\'), is what detects it.',
        security: [{ geminiApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Ticket' },
                  {
                    type: 'object',
                    properties: {
                      priority: { type: 'string', description: 'Optional triage context, used only for tone.' },
                      category: { type: 'string', description: 'Optional triage context, used only for tone.' },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Streamed reply text. The connection ends when generation finishes.',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
          400: { description: 'Invalid ticket body.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing API key.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          502: {
            description: 'The AI provider failed before any text was streamed. A failure mid-stream instead just ends the connection early (see routes/draftReply.js - the response is already committed to 200 by then).',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
}
