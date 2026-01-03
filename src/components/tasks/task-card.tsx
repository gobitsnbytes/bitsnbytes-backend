'use client'

import { useState } from 'react'
import { 
  DotsThree, 
  Play, 
  Pause, 
  CheckCircle, 
  Trash, 
  UserSwitch, 
  Clock,
  Archive,
} from '@phosphor-icons/react'
import type { TaskWithRelations } from '@/hooks/use-tasks'
import type { TaskStatus } from '@/lib/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

type TaskCardProps = {
  task: TaskWithRelations
  currentMemberId: string
  currentMemberRole: 'owner' | 'admin' | 'member'
  onStatusChange: (taskId: string, status: TaskStatus, waitingReason?: string) => void
  onDelete: (taskId: string) => void
  onArchive?: (taskId: string) => void
  onEdit: (task: TaskWithRelations) => void
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  inbox: { label: 'Inbox', className: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20' },
  active: { label: 'Active', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  waiting: { label: 'Waiting', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20' },
  done: { label: 'Done', className: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20' },
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  high: { label: 'High', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
}

export function TaskCard({
  task,
  currentMemberId,
  currentMemberRole,
  onStatusChange,
  onDelete,
  onArchive,
  onEdit,
}: TaskCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [waitingDialogOpen, setWaitingDialogOpen] = useState(false)
  const [waitingReason, setWaitingReason] = useState('')

  // Permission checks
  const isAssigner = task.assigner_id === currentMemberId
  const isAssignee = task.assignee_id === currentMemberId
  const isOwnerOrAdmin = currentMemberRole === 'owner' || currentMemberRole === 'admin'
  
  const canDelete = isAssigner || currentMemberRole === 'owner'
  const canChangeStatus = isAssigner || isAssignee || isOwnerOrAdmin
  const canMarkDone = isOwnerOrAdmin
  const canArchive = isOwnerOrAdmin && task.status === 'done' && onArchive

  // Available status transitions based on current status
  const getAvailableTransitions = (): { status: TaskStatus; label: string; icon: React.ElementType }[] => {
    const transitions: { status: TaskStatus; label: string; icon: React.ElementType }[] = []
    
    switch (task.status) {
      case 'inbox':
        transitions.push(
          { status: 'active', label: 'Start', icon: Play },
          { status: 'waiting', label: 'Mark as Waiting', icon: Clock },
        )
        break
      case 'active':
        transitions.push(
          { status: 'waiting', label: 'Mark as Waiting', icon: Clock },
          { status: 'inbox', label: 'Move to Inbox', icon: Pause },
        )
        if (canMarkDone) {
          transitions.push({ status: 'done', label: 'Mark Done', icon: CheckCircle })
        }
        break
      case 'waiting':
        transitions.push(
          { status: 'active', label: 'Resume', icon: Play },
          { status: 'inbox', label: 'Move to Inbox', icon: Pause },
        )
        if (canMarkDone) {
          transitions.push({ status: 'done', label: 'Mark Done', icon: CheckCircle })
        }
        break
      case 'done':
        // Done is final - no transitions
        break
    }
    
    return transitions
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'waiting') {
      setWaitingDialogOpen(true)
    } else {
      onStatusChange(task.id, newStatus)
    }
  }

  const handleWaitingSubmit = () => {
    if (waitingReason.trim()) {
      onStatusChange(task.id, 'waiting', waitingReason.trim())
      setWaitingReason('')
      setWaitingDialogOpen(false)
    }
  }

  const statusConfig = STATUS_CONFIG[task.status]
  const priorityConfig = PRIORITY_CONFIG[task.priority as 'low' | 'high']
  const availableTransitions = getAvailableTransitions()

  return (
    <>
      <div className="rounded-none border bg-card p-4 hover:bg-accent/5 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={cn('rounded-none', statusConfig.className)}>
                {statusConfig.label}
              </Badge>
              {task.priority === 'high' && (
                <Badge variant="outline" className={cn('rounded-none', priorityConfig.className)}>
                  {priorityConfig.label}
                </Badge>
              )}
              {task.team && (
                <Badge variant="outline" className="rounded-none bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                  {task.team.name}
                </Badge>
              )}
            </div>
            
            <h3 className="font-medium text-sm mb-1">{task.title}</h3>
            
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
            
            {task.waiting_reason && task.status === 'waiting' && (
              <div className="text-xs text-muted-foreground bg-yellow-500/5 border border-yellow-500/20 rounded-none p-2 mb-2">
                <strong>Waiting:</strong> {task.waiting_reason}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.assignee && (
                <span>Assigned to: {task.assignee.user_id}</span>
              )}
              {task.due_at && (
                <span>Due: {new Date(task.due_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          {canChangeStatus && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <DotsThree className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {availableTransitions.map(({ status, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status)}
                  >
                    <Icon className="size-4 mr-2" />
                    {label}
                  </DropdownMenuItem>
                ))}
                
                {(availableTransitions.length > 0 || canArchive || canDelete) && (
                  <DropdownMenuSeparator />
                )}
                
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <UserSwitch className="size-4 mr-2" />
                  Edit / Reassign
                </DropdownMenuItem>
                
                {canArchive && (
                  <DropdownMenuItem onClick={() => onArchive(task.id)}>
                    <Archive className="size-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(task.id)
                setDeleteDialogOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Waiting reason dialog */}
      <AlertDialog open={waitingDialogOpen} onOpenChange={setWaitingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Waiting</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason why this task is waiting. This helps team members understand what's blocking progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <textarea
              className="w-full min-h-[100px] rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g., Waiting for client approval, Blocked by API issue..."
              value={waitingReason}
              onChange={(e) => setWaitingReason(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWaitingSubmit}
              disabled={!waitingReason.trim()}
            >
              Mark as Waiting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
