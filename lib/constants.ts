import type { TaskCategory, TaskStatus, AssetStatus, SponsorStage, OutreachStatus } from './schemas'

// Task categories with display labels and colors
export const TASK_CATEGORIES: Record<TaskCategory, { label: string; color: string; bgColor: string }> = {
  event_setup: { label: 'Event Setup', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  sponsorship: { label: 'Sponsorship', color: 'text-green-700', bgColor: 'bg-green-100' },
  tech: { label: 'Tech', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  logistics: { label: 'Logistics', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  graphics: { label: 'Graphics', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  outreach: { label: 'Outreach', color: 'text-cyan-700', bgColor: 'bg-cyan-100' }
}

// Task status with display labels and colors
export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  blocked: { label: 'Blocked', color: 'text-red-700', bgColor: 'bg-red-100' },
  done: { label: 'Done', color: 'text-green-700', bgColor: 'bg-green-100' }
}

// Graphics asset status
export const ASSET_STATUSES: Record<AssetStatus, { label: string; color: string; bgColor: string }> = {
  requested: { label: 'Requested', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  designing: { label: 'Designing', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  review: { label: 'In Review', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  approved: { label: 'Approved', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  delivered: { label: 'Delivered', color: 'text-green-700', bgColor: 'bg-green-100' }
}

// Sponsor stages
export const SPONSOR_STAGES: Record<SponsorStage, { label: string; color: string; bgColor: string }> = {
  initial_contact: { label: 'Initial Contact', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  proposal_sent: { label: 'Proposal Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  negotiation: { label: 'Negotiation', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  confirmed: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-100' },
  stalled: { label: 'Stalled', color: 'text-red-700', bgColor: 'bg-red-100' }
}

// Outreach post status
export const OUTREACH_STATUSES: Record<OutreachStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  published: { label: 'Published', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' }
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
