# Support Desk Copilot

An AI assistant that helps support agents triage tickets and draft replies. A support agent
uploads a CSV of customer tickets; the app assigns each a priority and category, then helps
draft a response to a selected ticket.

> Status: project scaffold only. Import, triage, and reply-drafting features are not built yet.

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
   request; never stored or logged).
2. Upload a tickets CSV.
3. Review each ticket's AI-assigned priority, category, and reasoning.
4. Open a ticket to see the original message, the source passage behind the AI's analysis, and
   generate/edit a reply draft.

## Project structure

```
client/   React + Vite + Tailwind frontend
server/   Express backend (AI calls, CSV validation)
```

See [CLAUDE.md](./CLAUDE.md) for architecture rules and constraints, and
[DECISIONS.md](./DECISIONS.md) for the reasoning behind the main choices.
