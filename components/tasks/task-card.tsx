'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTasksStore } from '@/stores/tasksStore'
import type { TaskWithRelations, TaskStatus } from '@/lib/schemas'
import { TASK_STATUSES } from '@/lib/constants'
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import {
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
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

// Desaturated, professional status icons
const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-blue-400 dark:text-blue-500 animate-spin" />,
  blocked: <XCircle className="h-3.5 w-3.5 text-red-400 dark:text-red-500" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-500" />
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

  // Format deadline text
  const getDeadlineText = () => {
    if (isOverdue) {
      return `Overdue ${formatDistanceToNow(deadline, { addSuffix: true })}`
    }
    if (isDueToday) {
      return 'Due today'
    }
    return format(deadline, 'MMM d')
  }

  return (
    <div
      className={cn(
        'group relative rounded border transition-colors',
        // Flat, subtle background
        'bg-background/50 hover:bg-accent/5',
        // Thin, low-contrast border
        'border-border/40 hover:border-border/60',
        // Subtle indicators for overdue/today - low saturation
        isOverdue && 'border-l-2 border-l-red-500/40 dark:border-l-red-500/30',
        isDueToday && !isOverdue && 'border-l-2 border-l-amber-500/40 dark:border-l-amber-500/30',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Status icon inline with title */}
        <div className="shrink-0 flex items-center">
          {statusIcons[task.status]}
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex items-baseline justify-between gap-4">
          {/* Left side: Title + Secondary Info */}
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <span 
              className={cn(
                "text-sm font-medium truncate",
                task.status === 'done' && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>
            
            {showCategory && task.category && (
              <span className="text-[10px] text-muted-foreground/30 font-normal uppercase tracking-tight truncate shrink-0">
                {task.category}
              </span>
            )}
            
            {showEvent && task.event && (
              <span className="text-[10px] text-muted-foreground/20 font-normal truncate shrink-0">
                • {task.event.name}
              </span>
            )}
          </div>

          {/* Right side: Metadata - muted and smaller */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Deadline - secondary info */}
            <span
              className={cn(
                'text-[11px] tabular-nums whitespace-nowrap',
                isOverdue && 'text-red-500/70 font-medium',
                isDueToday && !isOverdue && 'text-amber-600/70 font-medium',
                !isOverdue && !isDueToday && 'text-muted-foreground/40'
              )}
            >
              {getDeadlineText()}
            </span>

            {/* Owner avatar - if present - extremely subtle */}
            {task.owner && (
              <Avatar className="h-5 w-5 shrink-0 grayscale opacity-40">
                <AvatarFallback className="text-[9px] font-bold bg-muted text-muted-foreground">
                  {getOwnerInitials(task.owner.name)}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(Object.keys(TASK_STATUSES) as TaskStatus[]).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isUpdating || task.status === status}
                    className="gap-2 text-xs"
                  >
                    {statusIcons[status]}
                    {TASK_STATUSES[status].label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(task)} className="text-xs">
                    Edit Task
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    Delete Task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Blocker note - only if blocked - shown below but still compact */}
      {task.status === 'blocked' && task.blocker_note && (
        <div className="px-3 pb-1.5 pt-0">
          <div className="flex items-center gap-1.5 text-[10px] text-red-600/60 border-t border-red-100/20 pt-1">
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{task.blocker_note}</span>
          </div>
        </div>
      )}
    </div>
  )
}
