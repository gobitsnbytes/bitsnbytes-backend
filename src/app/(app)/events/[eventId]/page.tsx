'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  // Redirect to calendar view
  useEffect(() => {
    if (eventId) {
      router.replace(`/events/${eventId}/calendar`)
    }
  }, [eventId, router])

  return null
}
