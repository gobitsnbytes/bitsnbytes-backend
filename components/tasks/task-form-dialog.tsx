'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { useTasksStore } from '@/stores/tasksStore'
import { type CreateTask, type TaskCategory, type TaskWithRelations } from '@/lib/schemas'
import { TASK_CATEGORIES } from '@/lib/constants'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  ownerId: string
  task?: TaskWithRelations
  defaultCategory?: TaskCategory
}

export function TaskFormDialog({
  open,
  onOpenChange,
  eventId,
  ownerId,
  task,
  defaultCategory
}: TaskFormDialogProps) {
  const { createTask, updateTask } = useTasksStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>(defaultCategory || 'event_setup')
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>()
  const [deadlineTime, setDeadlineTime] = useState('23:59')
  const [blockerNote, setBlockerNote] = useState('')
  const [error, setError] = useState('')

  const isEditing = !!task

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title)
        setCategory(task.category)
        setDeadlineDate(new Date(task.deadline))
        setDeadlineTime(format(new Date(task.deadline), 'HH:mm'))
        setBlockerNote(task.blocker_note || '')
      } else {
        setTitle('')
        setCategory(defaultCategory || 'event_setup')
        setDeadlineDate(undefined)
        setDeadlineTime('23:59')
        setBlockerNote('')
      }
      setError('')
    }
  }, [open, task, defaultCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Task title is required')
      return
    }

    if (!deadlineDate) {
      setError('Deadline date is required')
      return
    }

    setIsSubmitting(true)

    // Combine date and time
    const deadline = new Date(deadlineDate)
    const [hours, minutes] = deadlineTime.split(':').map(Number)
    deadline.setHours(hours, minutes, 0, 0)

    if (isEditing && task) {
      const { error: updateError } = await updateTask(task.id, {
        title: title.trim(),
        deadline: deadline.toISOString(),
        blocker_note: blockerNote || null
      })
      
      if (!updateError) {
        onOpenChange(false)
      } else {
        setError(updateError)
      }
    } else {
      const taskData: CreateTask = {
        event_id: eventId,
        category,
        title: title.trim(),
        owner_id: ownerId,
        deadline: deadline.toISOString()
      }

      const { error: createError } = await createTask(taskData)
      
      if (!createError) {
        onOpenChange(false)
      } else {
        setError(createError)
      }
    }

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the task details below.'
              : 'Add a new task to the event. Set a clear title and deadline.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="e.g., Book venue for 200 attendees"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_CATEGORIES) as TaskCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: TASK_CATEGORIES[cat].bgColor.includes('blue')
                              ? '#3b82f6'
                              : TASK_CATEGORIES[cat].bgColor.includes('green')
                              ? '#22c55e'
                              : TASK_CATEGORIES[cat].bgColor.includes('purple')
                              ? '#a855f7'
                              : TASK_CATEGORIES[cat].bgColor.includes('orange')
                              ? '#f97316'
                              : TASK_CATEGORIES[cat].bgColor.includes('pink')
                              ? '#ec4899'
                              : '#06b6d4'
                          }}
                        />
                        {TASK_CATEGORIES[cat].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !deadlineDate && 'text-muted-foreground'
                    )}
                  >
                    {deadlineDate ? (
                      format(deadlineDate, 'MMM d, yyyy')
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadlineDate}
                    onSelect={setDeadlineDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
              />
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="blocker">Blocker Note (optional)</Label>
              <Textarea
                id="blocker"
                placeholder="If blocked, describe what's preventing progress..."
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
