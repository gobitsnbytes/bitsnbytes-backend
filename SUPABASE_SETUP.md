# Supabase Setup Guide for Event Execution Tracker

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Project Name**: `event-tracker` (or your choice)
   - **Database Password**: Create a strong password (save this)
   - **Region**: Choose closest to your users (e.g., `Singapore` for India)
5. Click "Create new project" and wait for it to initialize (5-10 minutes)

## Step 2: Get Your Credentials

1. Once project is ready, go to **Settings** → **API**
2. Copy these values:
   - `Project URL` (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public` key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Paste them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Create Database Tables

Go to **SQL Editor** in Supabase Dashboard and run these queries one by one:

### 1. Create Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'core_member')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own profile
CREATE POLICY "Users can see their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### 2. Create Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  organizer_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone authenticated can see all events
CREATE POLICY "Authenticated users can see events"
  ON events FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only organizers can create events
CREATE POLICY "Organizers can create events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'organizer')
  );

-- RLS Policy: Only organizers can update their events
CREATE POLICY "Organizers can update their events"
  ON events FOR UPDATE
  USING (organizer_id = auth.uid());

-- RLS Policy: Only organizers can delete their events
CREATE POLICY "Organizers can delete their events"
  ON events FOR DELETE
  USING (organizer_id = auth.uid());
```

### 3. Create Tasks Table
```sql
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

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see tasks they own or tasks in events they organized
CREATE POLICY "Users can see relevant tasks"
  ON tasks FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR 
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- RLS Policy: Users can create tasks in their events
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
  );

-- RLS Policy: Task owners and event organizers can update tasks
CREATE POLICY "Users can update relevant tasks"
  ON tasks FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
  );

-- RLS Policy: Task owners and event organizers can delete tasks
CREATE POLICY "Users can delete relevant tasks"
  ON tasks FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
  );
```

### 4. Create Graphics Assets Table
```sql
CREATE TABLE graphics_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'poster', 'story', 'banner', 'standee', 'reel'
  )),
  formats TEXT NOT NULL, -- JSON array stored as string
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'designing', 'review', 'approved', 'delivered'
  )),
  output_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE graphics_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see graphics assets for their tasks"
  ON graphics_assets FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
      OR event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage graphics assets"
  ON graphics_assets FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
      OR event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    )
  );
```

### 5. Create Outreach Posts Table
```sql
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

ALTER TABLE outreach_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see outreach posts for their tasks"
  ON outreach_posts FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
      OR event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage outreach posts"
  ON outreach_posts FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
      OR event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    )
  );
```

### 6. Create Sponsors Table
```sql
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

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see sponsors for their events"
  ON sponsors FOR SELECT
  USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can manage sponsors"
  ON sponsors FOR ALL
  USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR owner_id = auth.uid()
  );
```

### 7. Create Notifications Table
```sql
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

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
```

## Step 4: Enable Real-time (Optional but Recommended)

1. Go to **Database** → **Replication** in Supabase Dashboard
2. Enable replication for these tables:
   - `tasks`
   - `events`
   - `notifications`
   - `sponsors`

This allows the app to show real-time updates when other users make changes.

## Step 5: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Email provider should be enabled by default
3. Configure email settings if needed:
   - Go to **Email Templates** to customize welcome emails
4. In **URL Configuration**:
   - Add `http://localhost:3000` (development)
   - Add your production domain later

## Step 6: Update Your .env.local

Create `.env.local` in your project root:

```env
# Get these from Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 7: Create Test Users (Optional)

In Supabase Dashboard → **Authentication** → **Users**:

1. Click "Add user"
2. Create test users:
   - Email: `organizer@test.com` | Password: `Test1234!`
   - Email: `member@test.com` | Password: `Test1234!`

Then insert them into the `users` table:

```sql
-- Create organizer
INSERT INTO users (id, email, role, name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'organizer@test.com'),
  'organizer@test.com',
  'organizer',
  'Test Organizer'
);

-- Create core member
INSERT INTO users (id, email, role, name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'member@test.com'),
  'member@test.com',
  'core_member',
  'Test Member'
);
```

## Step 8: Start Using the App

1. Run: `npm run dev`
2. Go to `http://localhost:3000`
3. Sign up or log in
4. Start creating events!

## Troubleshooting

### "supabaseUrl is required" error
- Check your `.env.local` file has the correct URL
- Restart the dev server: `npm run dev`

### RLS Policy denying access
- Make sure user is logged in and has correct role
- Check the user exists in the `users` table with correct role
- Verify the RLS policy matches your use case

### Real-time not working
- Make sure you've enabled replication in Supabase
- Check browser console for errors
- Verify the channel name matches the table name

## Database Schema Summary

```
users (id, email, role, name, created_at)
  ├── events (id, name, event_date, organizer_id, created_at)
  │   ├── tasks (id, event_id, category, title, owner_id, deadline, status, blocker_note, ...)
  │   │   ├── graphics_assets (id, task_id, asset_type, formats, status, output_url, ...)
  │   │   └── outreach_posts (id, task_id, channel, content_asset_id, scheduled_time, status, ...)
  │   └── sponsors (id, event_id, company_name, current_stage, owner_id, follow_up_deadline, ...)
  └── notifications (id, user_id, task_id, type, message, read, ...)
```

## Security Best Practices

✅ Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code  
✅ Always use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for public authentication  
✅ RLS policies are enabled on all tables  
✅ Users can only see data they're authorized to see  
✅ Passwords are managed by Supabase Auth (never stored in your app)

You're all set! The frontend is already configured to work with this schema.
