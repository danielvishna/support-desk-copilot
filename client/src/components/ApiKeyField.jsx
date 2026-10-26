/**
 * @fileoverview The small settings field the brief requires for pasting a
 * Gemini API key. Shared across screens via ApiKeyContext.
 */

import { useApiKey } from '../state/ApiKeyContext.jsx'

/**
 * @return {React.ReactElement}
 */
export function ApiKeyField() {
  const { apiKey, setApiKey } = useApiKey()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="apiKey" className="text-xs font-medium text-gray-500">
        Gemini API key
      </label>
      <input
        id="apiKey"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Paste your key"
        autoComplete="off"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  )
}
