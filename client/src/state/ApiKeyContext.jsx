/**
 * @fileoverview Holds the Gemini API key the user pastes into settings.
 * Deliberately separate from TicketsContext - this is a UI/session concern
 * (where does the key live right now), not ticket domain state. The key is
 * never persisted (no localStorage) per CLAUDE.md's "never persist the key"
 * rule - it's gone on refresh by design.
 */

import { createContext, useContext, useState } from 'react'

const ApiKeyContext = createContext(null)

/**
 * @param {{children: React.ReactNode}} props
 * @return {React.ReactElement}
 */
export function ApiKeyProvider({ children }) {
  const [apiKey, setApiKey] = useState('')
  return <ApiKeyContext.Provider value={{ apiKey, setApiKey }}>{children}</ApiKeyContext.Provider>
}

/**
 * @return {{apiKey: string, setApiKey: function(string): void}}
 */
export function useApiKey() {
  const ctx = useContext(ApiKeyContext)
  if (!ctx) throw new Error('useApiKey must be used within an ApiKeyProvider')
  return ctx
}
