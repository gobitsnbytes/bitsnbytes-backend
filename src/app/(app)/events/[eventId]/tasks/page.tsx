'use client'

import { use } from 'react'
import { KanbanBoard } from '@/components/kanban-board'

export default function TasksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = use(params)

  return (
    <div className="flex h-full flex-col">
      <KanbanBoard eventId={eventId} />
    </div>
  )
}
