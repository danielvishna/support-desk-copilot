/**
 * @fileoverview React Context wiring for ticketsReducer.js. Kept separate
 * from the reducer itself so the state logic stays framework-agnostic and
 * from UI components so components never dispatch raw action objects
 * inline (see useTickets()).
 */

import { createContext, useContext, useReducer } from 'react'
import { initialState, ticketsReducer } from './ticketsReducer.js'

const TicketsStateContext = createContext(null)
const TicketsDispatchContext = createContext(null)

/**
 * @param {{children: React.ReactNode}} props
 * @return {React.ReactElement}
 */
export function TicketsProvider({ children }) {
  const [state, dispatch] = useReducer(ticketsReducer, initialState)
  return (
    <TicketsStateContext.Provider value={state}>
      <TicketsDispatchContext.Provider value={dispatch}>{children}</TicketsDispatchContext.Provider>
    </TicketsStateContext.Provider>
  )
}

/**
 * @return {import('./ticketsReducer.js').AppState}
 */
export function useTicketsState() {
  const state = useContext(TicketsStateContext)
  if (!state) throw new Error('useTicketsState must be used within a TicketsProvider')
  return state
}

/**
 * @return {function(Object): void} The reducer's dispatch function.
 */
export function useTicketsDispatch() {
  const dispatch = useContext(TicketsDispatchContext)
  if (!dispatch) throw new Error('useTicketsDispatch must be used within a TicketsProvider')
  return dispatch
}
