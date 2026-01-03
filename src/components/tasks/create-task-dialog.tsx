'use client'

import { useState, useEffect } from 'react'
import { useEventMembers, useEventTeams } from '@/hooks/use-teams'
import type { TaskWithRelations } from '@/hooks/use-tasks'
import type { TaskStatus } from '@/lib/database.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CreateTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  currentMemberId: string
  currentMemberRole: 'owner' | 'admin' | 'member'
  editingTask?: TaskWithRelations | null
  onSubmit: (data: {
    title: string
    description?: string
    assigneeId?: string
    teamId?: string
    priority: 'low' | 'high'
    dueAt?: string
  }) => void
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  eventId,
  currentMemberId,
  currentMemberRole,
  editingTask,
  onSubmit,
}: CreateTaskDialogProps) {
  const { data: members = [] } = useEventMembers(eventId)
  const { data: teams = [] } = useEventTeams(eventId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignType, setAssignType] = useState<'member' | 'team'>('member')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const [priority, setPriority] = useState<'low' | 'high'>('low')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')

  // Filter members - no assigning to owners except by owner
  const assignableMembers = members.filter(member => {
    if (currentMemberRole === 'owner') return true
    return member.role !== 'owner'
  })

  // Reset form when dialog opens/closes or editing task changes
  useEffect(() => {
    if (open) {
      if (editingTask) {
        setTitle(editingTask.title)
        setDescription(editingTask.description || '')
        setPriority(editingTask.priority as 'low' | 'high')
        
        if (editingTask.team_id) {
          setAssignType('team')
          setTeamId(editingTask.team_id)
          setAssigneeId('')
        } else if (editingTask.assignee_id) {
          setAssignType('member')
          setAssigneeId(editingTask.assignee_id)
          setTeamId('')
        }
        
        if (editingTask.due_at) {
          const date = new Date(editingTask.due_at)
          setDueDate(date.toISOString().split('T')[0])
          setDueTime(date.toTimeString().slice(0, 5))
        }
      } else {
        // Default to current user as assignee for new tasks
        setAssigneeId(currentMemberId)
        setTeamId('')
      }
    } else {
      // Reset on close
      setTitle('')
      setDescription('')
      setAssignType('member')
      setAssigneeId('')
      setTeamId('')
      setPriority('low')
      setDueDate('')
      setDueTime('')
    }
  }, [open, editingTask, currentMemberId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return
    
    // Build due_at timestamp if date is set
    let dueAt: string | undefined
    if (dueDate) {
      const timeStr = dueTime || '23:59'
      dueAt = new Date(`${dueDate}T${timeStr}:00`).toISOString()
    }
    
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId: assignType === 'member' ? assigneeId : undefined,
      teamId: assignType === 'team' ? teamId : undefined,
      priority,
      dueAt,
    })
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask 
                ? 'Update task details and reassign if needed.'
                : 'Create a new task and assign it to a team member or team.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this task..."
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign To *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={assignType === 'member' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAssignType('member')}
                  className="flex-1"
                >
                  Member
                </Button>
                <Button
                  type="button"
                  variant={assignType === 'team' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAssignType('team')}
                  className="flex-1"
                >
                  Team
                </Button>
              </div>
            </div>

            {assignType === 'member' ? (
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.user_id} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Task will appear in the team leader's inbox for assignment
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'high')}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {dueDate && (
              <div className="space-y-2">
                <Label htmlFor="dueTime">Due Time</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || (assignType === 'member' && !assigneeId) || (assignType === 'team' && !teamId)}>
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
