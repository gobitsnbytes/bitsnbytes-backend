'use client'

import { Badge } from '@/components/ui/badge'
import { TASK_STATUSES, TASK_CATEGORIES, ASSET_STATUSES, SPONSOR_STAGES, OUTREACH_STATUSES } from '@/lib/constants'
import type { TaskStatus, TaskCategory, AssetStatus, SponsorStage, OutreachStatus } from '@/lib/schemas'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'default'
}

export function TaskStatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const config = TASK_STATUSES[status]
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        config.bgColor,
        config.color,
        'font-medium',
        size === 'sm' && 'text-xs px-2 py-0'
      )}
    >
      {config.label}
    </Badge>
  )
}

interface CategoryBadgeProps {
  category: TaskCategory
  size?: 'sm' | 'default'
}

export function TaskCategoryBadge({ category, size = 'default' }: CategoryBadgeProps) {
  const config = TASK_CATEGORIES[category]
  
  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.color,
        'border-0 font-medium',
        size === 'sm' && 'text-xs px-2 py-0'
      )}
    >
      {config.label}
    </Badge>
  )
}

interface AssetStatusBadgeProps {
  status: AssetStatus
}

export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  const config = ASSET_STATUSES[status]
  
  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, 'font-medium')}
    >
      {config.label}
    </Badge>
  )
}

interface SponsorStageBadgeProps {
  stage: SponsorStage
}

export function SponsorStageBadge({ stage }: SponsorStageBadgeProps) {
  const config = SPONSOR_STAGES[stage]
  
  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, 'font-medium')}
    >
      {config.label}
    </Badge>
  )
}

interface OutreachStatusBadgeProps {
  status: OutreachStatus
}

export function OutreachStatusBadge({ status }: OutreachStatusBadgeProps) {
  const config = OUTREACH_STATUSES[status]
  
  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, 'font-medium')}
    >
      {config.label}
    </Badge>
  )
}
