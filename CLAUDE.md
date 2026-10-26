# Support Desk Copilot

Practice AI-engineer home assignment. A support agent uploads a CSV of customer tickets; the app
uses AI to assign each ticket a priority (High/Medium/Low) and category (Billing, Technical,
Feature Request, Other) with a short reason, then helps the agent draft a reply to a selected
ticket. The AI must make useful triage decisions and draft a grounded reply — not paraphrase the
ticket, invent account information, or claim actions were taken.

## Working agreement

Ask planning and design questions before and during implementation of each non-trivial piece
(state shape, prompt design, validation rules, error handling, UI layout) rather than deciding
silently and presenting finished work. This holds for the whole project, not just the first pass.

## Stack (mandated)

- Frontend: React + Vite + Tailwind CSS + JavaScript (`/client`)
- Backend: Node.js + Express (`/server`)
- Added libraries must be justified — prefer what's already in the stack.

## Hard rules

- **API key**: arrives per-request from the client (settings field → sent with each AI request).
  Never persist or log it server-side. `GEMINI_API_KEY` in `server/.env` is only an optional local
  fallback, never committed.
- **Structured AI output**: request structured JSON from the model for triage results and
  **validate it against a schema** before using it. On invalid/unparseable JSON, retry once, then
  flag the ticket as needs-review rather than crashing or guessing.
- **Treat ticket text as untrusted data.** A ticket's subject/message may contain text that looks
  like an instruction (e.g. "ignore previous instructions"). It must never change the AI's
  behavior — it's customer data to analyze, not a command to follow.
- **Input limits**: enforce reasonable CSV size, row count, and per-field length limits. Reject or
  truncate gracefully — never send unbounded input to the model.
- **Streaming + Stop**: reply drafts stream into the browser. The Stop button must cancel the
  client request and, where the provider supports it, the upstream model call too.

## Architecture

Keep these as separate modules, not intermixed:
- **UI** — presentational components, no AI calls or validation logic inline.
- **Workflow / app state** — a reducer (`React Context` + `useReducer`) holding tickets, their
  triage results, drafted replies, and review status as explicit structured data. This state is
  the source of truth — never reconstruct it by re-reading chat/AI output text.
- **Input validation** — CSV parsing/validation lives in its own module, independent of the UI and
  of the AI-calling code.
- **AI logic** — prompt construction, the Gemini call, and response-schema validation live in
  their own module(s), separate from Express routing and from React.

## Build for the unexpected

Expect Hebrew/RTL content, malformed CSVs, conflicting urgency signals, very long messages, and
instructions embedded inside customer messages. Handle all of it without crashing.

## Documentation

Follow the [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html#jsdoc)
for JSDoc:
- Every file starts with an `@fileoverview` block explaining its role and why it's a separate
  module (ties back to the architecture rule above).
- Every exported function/constant gets a JSDoc block: `@param {type} name description`,
  `@return {type} description`, `@throws` when relevant. Use `@const {type}` for exported
  constants whose type isn't obvious from the value.
- Document the *why*/contract, not the obvious - skip JSDoc on trivial one-line helpers where the
  signature says everything, and never restate what a line of code already makes clear.
- Non-exported/internal helpers still get a short JSDoc block when their behavior isn't obvious
  from the name alone (e.g. a retry helper's return shape).

## Process

- Small, meaningful git commits — the history is reviewed.
- Keep `README.md` (setup/run/usage) and `DECISIONS.md` (choices, trade-offs, test scenarios)
  current as the project develops, not just at the end.
