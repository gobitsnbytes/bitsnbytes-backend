# AGENTS.md - Event Execution Tracker

## Project Overview

**Event Execution Tracker** is a real-time execution management system for college/club events. This app exists for one reason only: **to make sure events actually get executed on time, without confusion, delays, or "I thought someone else was doing it"**.[1][2][3]

**Core Principle**: Every feature must answer at least one of these questions:
1. What needs to be done?
2. Who is doing it?
3. By when?

If a feature doesn't help direct execution, it's out of scope.

***

## Tech Stack

```
Frontend: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
State: Zustand
Validation: Zod
Backend: Supabase (PostgreSQL + Auth + Realtime)
Deployment: Vercel
Icons: lucide-react
```

***

## Setup Commands

```bash
# Install dependencies
npm install

# Set up Supabase environment
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Database migrations
npx supabase migration new [migration_name]
npx supabase db push
```

***

## Project Structure

```
/app                    # Next.js App Router pages
  /dashboard           # Core member execution dashboard
  /events/[id]         # Event execution board (kanban view)
  /api                 # API routes (minimal, mostly use Supabase client)
/components
  /ui                  # shadcn/ui components
  /tasks               # Task cards, status badges
  /kanban              # Execution lane components
/lib
  /supabase.ts         # Supabase client initialization
  /schemas.ts          # Zod validation schemas
/stores
  /tasksStore.ts       # Zustand store for tasks
  /eventsStore.ts      # Zustand store for events
  /notificationsStore.ts
/supabase
  /migrations          # SQL migration files
  /seed.sql            # Seed data for development
```

***

## Database Schema

### Core Tables

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'core_member')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  organizer_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (atomic execution units)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'event_setup', 'sponsorship', 'tech', 'logistics', 'graphics', 'outreach'
  )),
  title TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'blocked', 'done'
  )),
  blocker_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Graphics Deliverables
CREATE TABLE graphics_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'poster', 'story', 'banner', 'standee', 'reel'
  )),
  formats TEXT NOT NULL, -- JSON array: ["1080x1080", "1920x1080"]
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'designing', 'review', 'approved', 'delivered'
  )),
  output_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Tracking
CREATE TABLE outreach_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN (
    'instagram', 'whatsapp', 'email', 'linkedin', 'partner'
  )),
  content_asset_id UUID REFERENCES graphics_assets(id),
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'published', 'failed'
  )),
  outcome_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsorship Pipeline
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'initial_contact', 'proposal_sent', 'negotiation', 'confirmed', 'stalled'
  )),
  next_action TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) NOT NULL,
  follow_up_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'task_overdue', 'task_blocked', 'deadline_approaching', 'asset_delivered', 
    'sponsor_confirmed', 'logistics_issue'
  )),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

***

## Code Style Guidelines

### TypeScript Rules
- **Always use TypeScript** with strict mode enabled
- Use `const` over `let`, never use `var`
- Prefer functional components and hooks
- Use Zod schemas for all data validation (Supabase responses, forms, API)

### Naming Conventions
```typescript
// Components: PascalCase
export function TaskCard() {}

// Hooks/Stores: camelCase with 'use' prefix
export const useTasksStore = create()

// Types: PascalCase with descriptive names
type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done'

// Constants: SCREAMING_SNAKE_CASE
const FIXED_CATEGORIES = ['event_setup', 'sponsorship', ...]
```

### Component Structure
```tsx
// 1. Imports (React, external libs, internal utils, types)
import { useState } from 'react'
import { useTasksStore } from '@/stores/tasksStore'
import { TaskSchema } from '@/lib/schemas'

// 2. Types/Interfaces
interface TaskCardProps {
  taskId: string
  variant?: 'compact' | 'full'
}

// 3. Component
export function TaskCard({ taskId, variant = 'compact' }: TaskCardProps) {
  // Hooks first
  const updateTask = useTasksStore((s) => s.updateTaskStatus)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Event handlers
  const handleStatusChange = async (status: TaskStatus) => {
    await updateTask(taskId, status)
  }
  
  // Render
  return (...)
}
```

***

## State Management Pattern

### Zustand Store Pattern (with Optimistic Updates)
```typescript
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface TasksStore {
  tasks: Task[]
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>
}

export const useTasksStore = create<TasksStore>((set, get) => ({
  tasks: [],
  
  updateTaskStatus: async (id, status) => {
    // 1. Optimistic UI update (instant feedback)
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, status } : task
      )
    }))
    
    // 2. Sync to Supabase
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    // 3. Rollback if error
    if (error) {
      console.error('Failed to update task:', error)
      get().fetchTasks() // Refetch to restore correct state
    }
  }
}))
```

***

## Real-time Subscriptions

### Supabase Realtime Setup
```typescript
// In app layout or dashboard component
useEffect(() => {
  const channel = supabase
    .channel('tasks_changes')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `owner_id=eq.${currentUserId}` 
      },
      (payload) => {
        // Update Zustand store with real-time changes
        useTasksStore.getState().handleRealtimeUpdate(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [currentUserId])
```

***

## Testing Instructions

### Test Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Patterns
- **Component tests**: Use React Testing Library
- **Store tests**: Test optimistic updates + error rollback
- **Validation tests**: Test all Zod schemas with valid/invalid data
- **Integration tests**: Test Supabase RLS policies

```typescript
// Example: Task status update test
describe('TasksStore', () => {
  it('should optimistically update task status', async () => {
    const { result } = renderHook(() => useTasksStore())
    
    act(() => {
      result.current.updateTaskStatus('task-123', 'done')
    })
    
    // Should update immediately (optimistic)
    expect(result.current.tasks[0].status).toBe('done')
  })
})
```

***

## Security Considerations

### Row Level Security (RLS) Policies
All tables **must** have RLS enabled. Never disable RLS.

```sql
-- Example: Tasks RLS policy
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Core members can only see tasks they own or tasks in their events
CREATE POLICY "Core members see own tasks"
ON tasks FOR SELECT
USING (
  owner_id = auth.uid() 
  OR 
  event_id IN (
    SELECT id FROM events WHERE organizer_id = auth.uid()
  )
);

-- Only task owners can update their tasks
CREATE POLICY "Owners update own tasks"
ON tasks FOR UPDATE
USING (owner_id = auth.uid());
```

### Environment Variables
```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # Server-side only
```

***

## MVP Constraints (Hard Rules)

### What to Build
✅ Core member dashboard (tasks due today, overdue, blocked)  
✅ Event execution board (kanban with 6 fixed categories)  
✅ Task CRUD (create, update status, assign owner, set deadline)  
✅ Real-time task updates  
✅ Graphics deliverable tracking  
✅ Outreach action tracking  
✅ Sponsor pipeline tracking  
✅ Role-based access (organizer vs core_member)  
✅ Email login only  

### What NOT to Build (MVP)
❌ Public dashboards or event pages  
❌ Planning tools, brainstorming boards  
❌ Analytics, reports, charts  
❌ Workflow automation  
❌ Custom event categories  
❌ OAuth/SSO login  
❌ Mobile native apps (web only, mobile-responsive)  
❌ Third-party integrations (Slack, Calendar, etc.)  
❌ File uploads beyond graphics deliverables  

***

## PR and Commit Guidelines

### Commit Message Format
```
type(scope): description

Examples:
feat(tasks): add real-time status sync
fix(auth): handle expired session redirect
chore(deps): upgrade Next.js to 15.1
```

### Before Submitting PR
1. Run `npm run lint` (must pass)
2. Run `npm test` (all tests green)
3. Test mobile responsiveness (Chrome DevTools)
4. Verify real-time updates work (open 2 tabs)
5. Check RLS policies work (test as different users)

### PR Title Format
```
[Component] Brief description

Examples:
[Dashboard] Add overdue tasks filter
[Graphics] Implement asset delivery tracking
[Auth] Fix role-based redirect after login
```

***

## Development Workflow

### Adding a New Feature
1. Create Zod schema in `/lib/schemas.ts`
2. Add database migration in `/supabase/migrations/`
3. Create Zustand store in `/stores/`
4. Build UI components in `/components/`
5. Add RLS policies
6. Write tests
7. Test real-time sync with 2+ browser tabs

### Common Tasks
```bash
# Add shadcn/ui component
npx shadcn-ui@latest add [component-name]

# Create new Supabase migration
npx supabase migration new [description]

# Reset local database
npx supabase db reset

# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --local > lib/database.types.ts
```

***

## Debugging Tips

### Supabase Real-time Not Working
- Check RLS policies (real-time respects RLS)
- Verify subscription channel name matches table
- Check browser console for subscription errors
- Use Supabase Dashboard > Database > Replication to enable real-time for table

### Optimistic Update Rollback
- Check network tab for Supabase errors
- Verify Zod schema matches database schema
- Test RLS policy allows update for current user

### Mobile Layout Issues
- Use Tailwind's `sm:`, `md:`, `lg:` breakpoints
- Test on actual device, not just DevTools
- Dashboard must be usable on 375px width (iPhone SE)

***

## Deployment Checklist

### Before First Deploy
- [ ] Set environment variables in Vercel
- [ ] Run database migrations on production Supabase
- [ ] Enable RLS on all tables
- [ ] Create first organizer user manually in Supabase Dashboard
- [ ] Test email login flow
- [ ] Verify real-time works in production

### Post-Deploy Testing
- [ ] Create test event as organizer
- [ ] Add test tasks in all 6 categories
- [ ] Update task status as core member
- [ ] Verify notifications fire correctly
- [ ] Test mobile responsiveness on real device

***

## Contact & Support

For questions about architecture decisions or implementation details, refer to this AGENTS.md file first. When adding new features, update this file to maintain accuracy for AI coding assistants.[4][5]

***

**Last Updated**: December 21, 2025  
**Format Version**: AGENTS.md v1.0[1]
