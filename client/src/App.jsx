/**
 * @fileoverview Top-level view router. Deliberately a plain useState
 * switch rather than a routing library - three screens don't justify the
 * extra dependency (see DECISIONS.md).
 */

import { useState } from 'react'
import { ImportScreen } from './screens/ImportScreen.jsx'
import { TicketDetailScreen } from './screens/TicketDetailScreen.jsx'
import { TicketListScreen } from './screens/TicketListScreen.jsx'
import { ApiKeyProvider } from './state/ApiKeyContext.jsx'
import { TicketsProvider, useTicketsState } from './state/TicketsContext.jsx'

function AppShell() {
  const { ticketOrder } = useTicketsState()
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [forceImportView, setForceImportView] = useState(false)

  if (selectedTicketId) {
    return <TicketDetailScreen ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
  }

  if (ticketOrder.length === 0 || forceImportView) {
    return <ImportScreen onImported={() => setForceImportView(false)} />
  }

  return <TicketListScreen onSelectTicket={setSelectedTicketId} onImportNew={() => setForceImportView(true)} />
}

/**
 * @return {React.ReactElement}
 */
function App() {
  return (
    <ApiKeyProvider>
      <TicketsProvider>
        <AppShell />
      </TicketsProvider>
    </ApiKeyProvider>
  )
}

export default App
