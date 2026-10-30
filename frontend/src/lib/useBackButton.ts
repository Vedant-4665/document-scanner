import { useEffect, useRef } from 'react'

// Makes the browser's Back button (and a phone's Back gesture) move back one
// step inside the app, instead of leaving the app.
//
// This is a single-page app with no real page changes, so the browser has no
// idea the user went "deeper" (for example from the page list to the corner
// screen). We tell it: whenever the app goes one step deeper, we add an entry
// to the browser's history. Pressing Back then removes that entry, and we
// respond by moving the app back one step.
//
//   depth:  how many steps deep the app is right now (0 = the home screen)
//   onBack: called when the user presses Back; it must go back exactly one step
export function useBackButton(depth: number, onBack: () => void) {
  // How many history entries we have added so far.
  const entriesAdded = useRef(0)
  // How many "Back" events were caused by our own code (not by the user).
  const ownEvents = useRef(0)
  // Always the newest onBack, without re-registering the listener each render.
  const latestOnBack = useRef(onBack)
  useEffect(() => {
    latestOnBack.current = onBack
  })

  // The user pressed Back.
  useEffect(() => {
    function handlePop() {
      if (ownEvents.current > 0) {
        ownEvents.current -= 1 // we caused this one ourselves: ignore it
        return
      }
      if (entriesAdded.current > 0) {
        entriesAdded.current -= 1 // the browser just removed one of our entries
        latestOnBack.current()
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // The app went deeper or came back by itself (a button, not the Back key):
  // keep the browser's history in step with it.
  useEffect(() => {
    if (depth > entriesAdded.current) {
      while (entriesAdded.current < depth) {
        entriesAdded.current += 1
        window.history.pushState({ docscanDepth: entriesAdded.current }, '')
      }
    } else if (depth < entriesAdded.current) {
      const extra = entriesAdded.current - depth
      entriesAdded.current = depth
      ownEvents.current += 1 // going back several entries at once fires one event
      window.history.go(-extra)
    }
  }, [depth])
}
