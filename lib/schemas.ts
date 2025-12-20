import { z } from 'zod'

// User roles
export const UserRole = z.enum(['organizer', 'core_member'])
export type UserRole = z.infer<typeof UserRole>

// Task categories - fixed 6 categories
export const TaskCategory = z.enum([
  'event_setup',
  'sponsorship',
  'tech',
  'logistics',
  'graphics',
  'outreach'
])
export type TaskCategory = z.infer<typeof TaskCategory>

// Task status
export const TaskStatus = z.enum(['pending', 'in_progress', 'blocked', 'done'])
export type TaskStatus = z.infer<typeof TaskStatus>

// Graphics asset types
export const AssetType = z.enum(['poster', 'story', 'banner', 'standee', 'reel'])
export type AssetType = z.infer<typeof AssetType>

// Graphics asset status
export const AssetStatus = z.enum(['requested', 'designing', 'review', 'approved', 'delivered'])
export type AssetStatus = z.infer<typeof AssetStatus>

// Outreach channels
export const OutreachChannel = z.enum(['instagram', 'whatsapp', 'email', 'linkedin', 'partner'])
export type OutreachChannel = z.infer<typeof OutreachChannel>

// Outreach post status
export const OutreachStatus = z.enum(['pending', 'scheduled', 'published', 'failed'])
export type OutreachStatus = z.infer<typeof OutreachStatus>

// Sponsor stages
export const SponsorStage = z.enum([
  'initial_contact',
  'proposal_sent',
  'negotiation',
  'confirmed',
  'stalled'
])
export type SponsorStage = z.infer<typeof SponsorStage>

// Notification types
export const NotificationType = z.enum([
  'task_overdue',
  'task_blocked',
  'deadline_approaching',
  'asset_delivered',
  'sponsor_confirmed',
  'logistics_issue'
])
export type NotificationType = z.infer<typeof NotificationType>

// User schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRole,
  name: z.string().min(1),
  created_at: z.string().datetime().optional()
})
export type User = z.infer<typeof UserSchema>

// Event schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  event_date: z.string().datetime(),
  organizer_id: z.string().uuid(),
  created_at: z.string().datetime().optional()
})
export type Event = z.infer<typeof EventSchema>

// Task schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  category: TaskCategory,
  title: z.string().min(1),
  owner_id: z.string().uuid(),
  deadline: z.string().datetime(),
  status: TaskStatus,
  blocker_note: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})
export type Task = z.infer<typeof TaskSchema>

// Task with related data
export const TaskWithRelationsSchema = TaskSchema.extend({
  owner: UserSchema.pick({ id: true, name: true, email: true }).optional(),
  event: EventSchema.pick({ id: true, name: true, event_date: true }).optional()
})
export type TaskWithRelations = z.infer<typeof TaskWithRelationsSchema>

// Graphics asset schema
export const GraphicsAssetSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  asset_type: AssetType,
  formats: z.string(), // JSON array stored as string
  status: AssetStatus,
  output_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime().optional()
})
export type GraphicsAsset = z.infer<typeof GraphicsAssetSchema>

// Outreach post schema
export const OutreachPostSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  channel: OutreachChannel,
  content_asset_id: z.string().uuid().nullable().optional(),
  scheduled_time: z.string().datetime(),
  status: OutreachStatus,
  outcome_note: z.string().nullable().optional(),
  created_at: z.string().datetime().optional()
})
export type OutreachPost = z.infer<typeof OutreachPostSchema>

// Sponsor schema
export const SponsorSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  company_name: z.string().min(1),
  current_stage: SponsorStage,
  next_action: z.string().min(1),
  owner_id: z.string().uuid(),
  follow_up_deadline: z.string().datetime(),
  created_at: z.string().datetime().optional()
})
export type Sponsor = z.infer<typeof SponsorSchema>

// Notification schema
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  task_id: z.string().uuid().nullable().optional(),
  type: NotificationType,
  message: z.string().min(1),
  read: z.boolean().default(false),
  created_at: z.string().datetime().optional()
})
export type Notification = z.infer<typeof NotificationSchema>

// Form schemas for creating/updating
export const CreateTaskSchema = z.object({
  event_id: z.string().uuid(),
  category: TaskCategory,
  title: z.string().min(1, 'Task title is required'),
  owner_id: z.string().uuid(),
  deadline: z.string().datetime()
})
export type CreateTask = z.infer<typeof CreateTaskSchema>

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  owner_id: z.string().uuid().optional(),
  deadline: z.string().datetime().optional(),
  status: TaskStatus.optional(),
  blocker_note: z.string().nullable().optional()
})
export type UpdateTask = z.infer<typeof UpdateTaskSchema>

export const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  event_date: z.string().datetime()
})
export type CreateEvent = z.infer<typeof CreateEventSchema>

export const CreateSponsorSchema = z.object({
  event_id: z.string().uuid(),
  company_name: z.string().min(1, 'Company name is required'),
  current_stage: SponsorStage,
  next_action: z.string().min(1, 'Next action is required'),
  owner_id: z.string().uuid(),
  follow_up_deadline: z.string().datetime()
})
export type CreateSponsor = z.infer<typeof CreateSponsorSchema>

export const CreateGraphicsAssetSchema = z.object({
  task_id: z.string().uuid(),
  asset_type: AssetType,
  formats: z.array(z.string()).min(1, 'At least one format is required')
})
export type CreateGraphicsAsset = z.infer<typeof CreateGraphicsAssetSchema>

export const CreateOutreachPostSchema = z.object({
  task_id: z.string().uuid(),
  channel: OutreachChannel,
  content_asset_id: z.string().uuid().nullable().optional(),
  scheduled_time: z.string().datetime()
})
export type CreateOutreachPost = z.infer<typeof CreateOutreachPostSchema>

// Login schema
export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})
export type LoginCredentials = z.infer<typeof LoginSchema>

// Sign up schema
export const SignUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: UserRole
})
export type SignUpCredentials = z.infer<typeof SignUpSchema>
