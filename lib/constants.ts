import type { TaskCategory, TaskStatus, AssetStatus, SponsorStage, OutreachStatus } from './schemas'

// Task categories with display labels and colors
export const TASK_CATEGORIES: Record<TaskCategory, { label: string; color: string; bgColor: string }> = {
  event_setup: { label: 'Event Setup', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/50' },
  sponsorship: { label: 'Sponsorship', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950/50' },
  tech: { label: 'Tech', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-950/50' },
  logistics: { label: 'Logistics', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-950/50' },
  graphics: { label: 'Graphics', color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-950/50' },
  outreach: { label: 'Outreach', color: 'text-cyan-700 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-950/50' }
}

// Task status with display labels and colors
export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800/50' },
  in_progress: { label: 'In Progress', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/50' },
  blocked: { label: 'Blocked', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950/50' },
  done: { label: 'Done', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950/50' }
}

// Graphics asset status
export const ASSET_STATUSES: Record<AssetStatus, { label: string; color: string; bgColor: string }> = {
  requested: { label: 'Requested', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800/50' },
  designing: { label: 'Designing', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-950/50' },
  review: { label: 'In Review', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/50' },
  approved: { label: 'Approved', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-950/50' },
  delivered: { label: 'Delivered', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950/50' }
}

// Sponsor stages
export const SPONSOR_STAGES: Record<SponsorStage, { label: string; color: string; bgColor: string }> = {
  initial_contact: { label: 'Initial Contact', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800/50' },
  proposal_sent: { label: 'Proposal Sent', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/50' },
  negotiation: { label: 'Negotiation', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-950/50' },
  confirmed: { label: 'Confirmed', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950/50' },
  stalled: { label: 'Stalled', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950/50' }
}

// Outreach post status
export const OUTREACH_STATUSES: Record<OutreachStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800/50' },
  scheduled: { label: 'Scheduled', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/50' },
  published: { label: 'Published', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950/50' },
  failed: { label: 'Failed', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950/50' }
}

// Outreach channel icons
export const OUTREACH_CHANNELS = {
  instagram: { label: 'Instagram', icon: 'Instagram' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle' },
  email: { label: 'Email', icon: 'Mail' },
  linkedin: { label: 'LinkedIn', icon: 'Linkedin' },
  partner: { label: 'Partner', icon: 'Users' }
} as const

// Asset types
export const ASSET_TYPES = {
  poster: { label: 'Poster', icon: 'Image' },
  story: { label: 'Story', icon: 'Smartphone' },
  banner: { label: 'Banner', icon: 'PanelTop' },
  standee: { label: 'Standee', icon: 'RectangleVertical' },
  reel: { label: 'Reel', icon: 'Video' }
} as const
