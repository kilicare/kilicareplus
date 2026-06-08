import { useState, useEffect } from 'react'

export function useFeedSession() {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    // Get existing session ID or create new one
    let sid = localStorage.getItem('feed_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('feed_session_id', sid)
    }
    setSessionId(sid)
  }, [])

  const resetSession = () => {
    const newSid = crypto.randomUUID()
    localStorage.setItem('feed_session_id', newSid)
    setSessionId(newSid)
  }

  return { sessionId, resetSession }
}
