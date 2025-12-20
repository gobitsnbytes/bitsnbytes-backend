'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskFormDialog } from '@/components/tasks/task-form-dialog'
import type { TaskCategory, TaskWithRelations } from '@/lib/schemas'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  category: TaskCategory
  title: string
  tasks: TaskWithRelations[]
  eventId: string
  ownerId: string
  color: string
  bgColor: string
  onEditTask?: (task: TaskWithRelations) => void
  onDeleteTask?: (taskId: string) => void
}

export function KanbanColumn({
  category,
  title,
  tasks,
  eventId,
  ownerId,
  color,
  bgColor,
  onEditTask,
  onDeleteTask
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)

  const pendingCount = tasks.filter((t) => t.status === 'pending').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <>
      <Card className="w-[320px] flex flex-col max-h-[calc(100vh-200px)]">
        <CardHeader className={cn('p-3 border-b', bgColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className={cn('text-sm font-semibold', color)}>
                {title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* Status summary */}
          <div className="flex gap-2 mt-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-xs bg-slate-50">
                {pendingCount} pending
              </Badge>
            )}
            {inProgressCount > 0 && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                {inProgressCount} active
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                {blockedCount} blocked
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tasks yet
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showCategory={false}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <TaskFormDialog
        open={isAddingTask}
        onOpenChange={setIsAddingTask}
        eventId={eventId}
        ownerId={ownerId}
        defaultCategory={category}
      />
    </>
  )
}
