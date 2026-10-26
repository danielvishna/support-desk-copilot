import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const SAMPLE_TICKET = {
  id: 'T-002',
  customer: 'Alex',
  subject: 'Cannot log in',
  message: 'Our entire team cannot access the dashboard, and we have a customer demo in an hour.',
}

// Temporary deploy smoke-test screen: confirms client -> server -> Gemini
// works end to end. Will be replaced by the real import/triage/chat UI.
function App() {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!apiKey.trim()) {
      setStatus('error')
      setErrorMessage('Enter your Gemini API key first.')
      return
    }

    setStatus('loading')
    setErrorMessage('')
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey.trim(),
        },
        body: JSON.stringify(SAMPLE_TICKET),
      })
      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setErrorMessage(data.error || `Request failed (${response.status})`)
        return
      }

      setStatus('success')
      setResult(data)
    } catch {
      setStatus('error')
      setErrorMessage('Could not reach the server. Is it running and is the API URL correct?')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold">Support Desk Copilot</h1>
        <p className="text-sm text-gray-500">Deploy smoke test — client ↔ server ↔ Gemini</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="apiKey" className="text-sm font-medium">
          Gemini API key
        </label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your key"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          autoComplete="off"
        />

        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-medium text-gray-700">Sample ticket sent:</p>
          <p>"{SAMPLE_TICKET.message}"</p>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === 'loading' ? 'Triaging...' : 'Run triage'}
        </button>
      </form>

      {status === 'error' && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {status === 'success' && result && (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-3 text-sm">
          <p>
            <span className="font-medium">Priority:</span> {result.priority}
          </p>
          <p>
            <span className="font-medium">Category:</span> {result.category}
          </p>
          <p>
            <span className="font-medium">Reason:</span> {result.reason}
          </p>
        </div>
      )}

      {status === 'idle' && (
        <p className="text-sm text-gray-400">Enter your key and run the sample ticket through triage.</p>
      )}
    </main>
  )
}

export default App
