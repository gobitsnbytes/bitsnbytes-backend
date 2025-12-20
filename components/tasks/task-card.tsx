'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskStatusBadge, TaskCategoryBadge } from './status-badge'
import { useTasksStore } from '@/stores/tasksStore'
import type { TaskWithRelations, TaskStatus } from '@/lib/schemas'
import { TASK_STATUSES } from '@/lib/constants'
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import {
  MoreHorizontal,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TaskCardProps {
  task: TaskWithRelations
  variant?: 'compact' | 'full'
  showCategory?: boolean
  showEvent?: boolean
  onEdit?: (task: TaskWithRelations) => void
  onDelete?: (taskId: string) => void
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-slate-500" />,
  in_progress: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  blocked: <XCircle className="h-4 w-4 text-red-500" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />
}

export function TaskCard({
  task,
  variant = 'compact',
  showCategory = true,
  showEvent = false,
  onEdit,
  onDelete
}: TaskCardProps) {
  const updateTaskStatus = useTasksStore((s) => s.updateTaskStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const deadline = new Date(task.deadline)
  const isOverdue = isPast(deadline) && task.status !== 'done'
  const isDueToday = isToday(deadline) && task.status !== 'done'

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdating(true)
    await updateTaskStatus(task.id, newStatus)
    setIsUpdating(false)
  }

  const getOwnerInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        isOverdue && 'border-red-300 bg-red-50/50',
        isDueToday && !isOverdue && 'border-yellow-300 bg-yellow-50/50',
        task.status === 'blocked' && 'border-red-400'
      )}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {statusIcons[task.status]}
            <span className="font-medium text-sm truncate">{task.title}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Change Status
              </DropdownMenuItem>
              {(Object.keys(TASK_STATUSES) as TaskStatus[]).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating || task.status === status}
                  className="gap-2"
                >
                  {statusIcons[status]}
                  {TASK_STATUSES[status].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  Edit Task
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-red-600"
                >
                  Delete Task
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <TaskStatusBadge status={task.status} size="sm" />
          {showCategory && <TaskCategoryBadge category={task.category} size="sm" />}
        </div>

        {/* Blocker note */}
        {task.status === 'blocked' && task.blocker_note && (
          <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-100 rounded p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{task.blocker_note}</span>
          </div>
        )}

        {/* Event name */}
        {showEvent && task.event && (
          <div className="text-xs text-muted-foreground truncate">
            {task.event.name}
          </div>
        )}

        {/* Footer: deadline & owner */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue && 'text-red-600 font-medium',
              isDueToday && !isOverdue && 'text-yellow-600 font-medium',
              !isOverdue && !isDueToday && 'text-muted-foreground'
            )}
          >
            {isOverdue ? (
              <Clock className="h-3.5 w-3.5" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            <span>
              {isOverdue
                ? `Overdue by ${formatDistanceToNow(deadline)}`
                : isDueToday
                ? 'Due today'
                : format(deadline, 'MMM d, h:mm a')}
            </span>
          </div>

          {task.owner && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getOwnerInitials(task.owner.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
