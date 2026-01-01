'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAppStore } from '@/lib/store'

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const eventId = params.eventId as string
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)

  // Set current event ID whenever navigating to any event page
  useEffect(() => {
    if (eventId) {
      setCurrentEventId(eventId)
    }
  }, [eventId, setCurrentEventId])

  return <>{children}</>
}
