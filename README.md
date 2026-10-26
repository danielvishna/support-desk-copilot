# Support Desk Copilot

An AI assistant that helps support agents triage tickets and draft replies. A support agent
uploads a CSV of customer tickets; the app assigns each a priority and category, then helps
draft a response to a selected ticket.

> Status: CSV import, AI triage, and the ticket list/detail screens work. Reply-draft generation
> (streaming + Stop) is not built yet - the draft field is manually editable for now.

## Stack

- Frontend: React + Vite + Tailwind CSS (`/client`)
- Backend: Node.js + Express (`/server`)
- AI provider: Google Gemini (AI Studio)

## Setup

```bash
# client
cd client
npm install
npm run dev        # http://localhost:5173

# server (separate terminal)
cd server
npm install
cp .env.example .env
npm run dev         # http://localhost:3001
```

## Supported CSV format

Ticket CSVs must have an `id`, `customer`, `subject`, and `message` column. See
`server/fixtures/example-tickets.csv` for an example.

```csv
id,customer,subject,message
T-001,Noa,Duplicate charge,"I was charged twice for the same subscription."
```

## Using the app

1. Paste your own Gemini API key into the settings field (sent to the server with each AI
   request; never stored or logged - it's also never saved to your browser, so you'll re-enter it
   after a refresh).
2. Upload a tickets CSV. Every ticket starts triaging automatically, one at a time.
3. The ticket list shows each ticket's priority, category, and review status, plus how many of
   the imported tickets have been reviewed.
4. Open a ticket to see the original message alongside the AI's priority/category/reasoning, edit
   a reply draft, and mark it reviewed. If triage failed or wasn't run yet, retry it from here.
5. **Import new CSV** replaces the current ticket set entirely - it does not merge with a
   previous import.

## Project structure

```
client/
  src/screens/    ImportScreen, TicketListScreen, TicketDetailScreen
  src/state/      ticketsReducer.js (app state) + ApiKeyContext/TicketsContext
  src/lib/        CSV parsing, triage API client, auto-triage runner
  src/components/ small presentational pieces (badges, API key field)
server/
  src/routes/     Express route handlers (thin)
  src/ai/         Gemini client, prompt/schema, error classification
  src/validation/ input + AI-output validation (zod)
```

See [CLAUDE.md](./CLAUDE.md) for architecture rules and constraints, and
[DECISIONS.md](./DECISIONS.md) for the reasoning behind the main choices.
