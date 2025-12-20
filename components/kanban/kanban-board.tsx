'use client'

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { KanbanColumn } from './kanban-column'
import { useTasksStore } from '@/stores/tasksStore'
import { TASK_CATEGORIES } from '@/lib/constants'
import type { TaskCategory, TaskWithRelations } from '@/lib/schemas'

interface KanbanBoardProps {
  eventId: string
  ownerId: string
  onEditTask?: (task: TaskWithRelations) => void
  onDeleteTask?: (taskId: string) => void
}

export function KanbanBoard({ eventId, ownerId, onEditTask, onDeleteTask }: KanbanBoardProps) {
  const tasks = useTasksStore((s) => s.tasks)
  const getTasksByCategory = useTasksStore((s) => s.getTasksByCategory)

  const categories = Object.keys(TASK_CATEGORIES) as TaskCategory[]

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-w-max">
        {categories.map((category) => {
          const categoryTasks = getTasksByCategory(category)
          const categoryConfig = TASK_CATEGORIES[category]

          return (
            <KanbanColumn
              key={category}
              category={category}
              title={categoryConfig.label}
              tasks={categoryTasks}
              eventId={eventId}
              ownerId={ownerId}
              color={categoryConfig.color}
              bgColor={categoryConfig.bgColor}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
