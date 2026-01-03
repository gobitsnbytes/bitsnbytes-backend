'use client'

import { useState } from 'react'
import { Plus, Funnel } from '@phosphor-icons/react'
import { useTasks, useArchivedTasks, useTaskStats, type TaskWithRelations } from '@/hooks/use-tasks'
import { useEventMembers, useEventTeams } from '@/hooks/use-teams'
import type { TaskStatus } from '@/lib/database.types'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type TaskListProps = {
  eventId: string
  currentMemberId: string
  currentMemberRole: 'owner' | 'admin' | 'member'
  onCreateTask: () => void
  onEditTask: (task: TaskWithRelations) => void
  onStatusChange: (taskId: string, status: TaskStatus, waitingReason?: string) => void
  onDeleteTask: (taskId: string) => void
  onArchiveTask: (taskId: string) => void
}

export function TaskList({
  eventId,
  currentMemberId,
  currentMemberRole,
  onCreateTask,
  onEditTask,
  onStatusChange,
  onDeleteTask,
  onArchiveTask,
}: TaskListProps) {
  const [activeTab, setActiveTab] = useState<'all' | TaskStatus | 'archive'>('all')
  const [filterTeamId, setFilterTeamId] = useState<string>('all')
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('all')

  // Build filters based on tab and selections
  const filters = {
    status: activeTab === 'archive' ? undefined : (activeTab === 'all' ? 'all' : activeTab),
    teamId: filterTeamId !== 'all' ? filterTeamId : undefined,
    assigneeId: filterAssigneeId !== 'all' ? filterAssigneeId : undefined,
  } as const

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(eventId, filters)
  const { data: archivedTasks = [], isLoading: archivedLoading } = useArchivedTasks(activeTab === 'archive' ? eventId : null)
  const stats = useTaskStats(eventId)
  const { data: members = [] } = useEventMembers(eventId)
  const { data: teams = [] } = useEventTeams(eventId)

  const isLoading = tasksLoading || (activeTab === 'archive' && archivedLoading)
  const displayTasks = activeTab === 'archive' ? archivedTasks : tasks

  const hasActiveFilters = filterTeamId !== 'all' || filterAssigneeId !== 'all'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button onClick={onCreateTask} size="sm">
            <Plus className="size-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-4">
            <Funnel className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
            <div className="flex gap-2">
              {filterTeamId !== 'all' && (
                <Badge variant="outline" className="rounded-none">
                  Team: {teams.find(t => t.id === filterTeamId)?.name}
                </Badge>
              )}
              {filterAssigneeId !== 'all' && (
                <Badge variant="outline" className="rounded-none">
                  Assignee: {members.find(m => m.id === filterAssigneeId)?.user_id}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterTeamId('all')
                setFilterAssigneeId('all')
              }}
            >
              Clear
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Select value={filterTeamId} onValueChange={setFilterTeamId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAssigneeId} onValueChange={setFilterAssigneeId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
          <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2">
            All
            {stats.total > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-none data-[state=active]:border-b-2">
            Inbox
            {stats.inbox > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {stats.inbox}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-none data-[state=active]:border-b-2">
            Active
            {stats.active > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {stats.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="waiting" className="rounded-none data-[state=active]:border-b-2">
            Waiting
            {stats.waiting > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {stats.waiting}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archive" className="rounded-none data-[state=active]:border-b-2">
            Archive
          </TabsTrigger>
        </TabsList>

        {/* Task Lists */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground mb-2">
                {activeTab === 'archive' 
                  ? 'No archived tasks'
                  : hasActiveFilters
                    ? 'No tasks match your filters'
                    : `No ${activeTab === 'all' ? '' : activeTab} tasks`}
              </p>
              {!hasActiveFilters && activeTab !== 'archive' && (
                <Button onClick={onCreateTask} variant="outline" size="sm">
                  <Plus className="size-4 mr-2" />
                  Create your first task
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayTasks.map((task: TaskWithRelations) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentMemberId={currentMemberId}
                  currentMemberRole={currentMemberRole}
                  onStatusChange={onStatusChange}
                  onDelete={onDeleteTask}
                  onArchive={activeTab === 'archive' ? undefined : onArchiveTask}
                  onEdit={onEditTask}
                />
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}
