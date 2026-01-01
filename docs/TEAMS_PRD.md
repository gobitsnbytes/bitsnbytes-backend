# Product Requirements Document: Teams & Members Management

**Document Version**: 1.0  
**Last Updated**: January 1, 2026  
**Status**: Implementation Ready

---

## Product Overview

This PRD defines the Teams and Members management system for the event management MVP. The feature enables event organizers to add collaborators to their events, organize them into teams, and manage permissions at the event level.

**Key Capabilities**:
- Invite members to events via email or shareable links
- Organize event members into teams for grouping and filtering
- Role-based permissions (Owner, Admin, Member)
- Team visibility scoped by role
- Event-level collaboration workspace

**Explicitly Out of Scope**:
- Participant/attendee registration
- Team-level permissions or settings
- Cross-event teams
- Real-time collaboration features
- Notifications or activity feeds

---

## User Roles

### Event-Level Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Event creator | Full control: manage event, members, teams, invites. Cannot transfer ownership. Cannot leave event. |
| **Admin** | Elevated collaborator | Manage members, teams, and invites. Can leave event voluntarily. Cannot delete event or change Owner. |
| **Member** | Standard collaborator | View assigned team(s) only. Can leave event voluntarily. Cannot manage teams or invite others. Cannot leave teams unless removed by Owner/Admin. |

### Role Assignment Rules
- Event creator automatically becomes Owner
- Invites always add users as Member role by default
- Owner/Admin can promote Members to Admin
- Owner/Admin can demote Admins to Member
- Owner role cannot be transferred (fixed for MVP)

---

## Core User Flows

### 1. Invite Member via Email
1. Owner/Admin navigates to Team page
2. Clicks "Invite Member" button
3. Selects "Email Invite" option
4. Enters invitee email address
5. System sends Supabase Auth invite email
6. Invitee receives email with signup/login link
7. On accepting invite, user is:
   - Created in Supabase Auth (if new user)
   - Added to `event_members` table with role "Member"
   - Redirected to event workspace

### 2. Invite Member via Link
1. Owner/Admin navigates to Team page
2. Clicks "Invite Member" button
3. Selects "Generate Link" option
4. System creates new `event_invites` record with UUID token
5. System displays shareable link with copy button
6. Admin shares link externally (Slack, Discord, etc.)
7. Anyone with link clicks and:
   - Authenticates via Supabase Auth (signup or login)
   - Token validated (not expired, belongs to event)
   - Added to `event_members` table with role "Member"
   - Redirected to event workspace

### 3. Create Team
1. Owner/Admin navigates to Team page
2. Clicks "New Team" button
3. Modal opens with team creation form
4. Enters team name (required)
5. Optionally adds description
6. Clicks "Create Team"
7. Team appears in left column team list
8. Team is empty (no members assigned yet)

### 4. Assign Member to Team
1. Owner/Admin selects team from left column
2. Right column shows team details
3. Clicks "Add Members" button
4. Modal opens with list of all event members
5. Checkboxes show current assignment state
6. Selects/deselects members
7. Clicks "Save"
8. Members added to `team_members` junction table
9. Team member count updates

### 5. Remove Member from Team
1. Owner/Admin selects team
2. Right column shows current team members
3. Clicks "X" icon next to member name
4. Confirmation dialog appears
5. On confirm, member removed from team
6. Member remains in event (not deleted)

### 6. Member Views Their Team
1. Member logs in and navigates to Team page
2. Sees only their assigned team(s) in left column
3. Clicking team shows other team members
4. Cannot see teams they're not part of
5. Cannot edit team or manage members

### 7. Leave Event
1. Member or Admin clicks "Leave Event" in settings
2. Confirmation dialog warns about losing access
3. On confirm, user removed from `event_members`
4. User also removed from all teams in event
5. Redirected to events homepage
6. Owner cannot leave (button hidden)

---

## Feature Scope

### In Scope
✅ Event member management (add, remove, role changes)  
✅ Email-based invites via Supabase Auth  
✅ Shareable invite links with token expiry  
✅ Team creation, editing, deletion  
✅ Member-to-team assignment (multiple teams allowed)  
✅ Role-based visibility (Members see only their teams)  
✅ Team list and detail views  
✅ Unassigned members support  
✅ Voluntary event departure (Members and Admins)

### Out of Scope
❌ Team-level permissions or settings  
❌ Team chat or comments  
❌ File sharing within teams  
❌ Team-specific tasks or calendars  
❌ Participant/attendee management  
❌ Email notifications for invites  
❌ Invite acceptance notifications  
❌ Activity logs or audit trails  
❌ Ownership transfer  
❌ Team templates or presets  
❌ External integrations (Slack, Discord)

---

## Application Layout and Navigation

### Main Sidebar (shadcn sidebar-9)
The main application sidebar contains:
- **Event Dropdown**: Current event selector with icon and dates
- **Workspace Section**:
  - Dashboard
  - Tasks
  - **Team** ← New page
  - Calendar
- **Footer Section**:
  - Events (link to homepage)
  - Settings
  - Sign out

The Team menu item is always visible when an event is selected. It follows the same active state pattern as other workspace items.

### Team Page Route
`/events/[eventId]/team`

Inherits `AppShell` layout (header + sidebar). Full-width content area with two-column layout.

---

## Teams and Members Feature Specification

### Team Page Layout

**Structure**: Two-column split layout

```
┌─────────────────────────────────────────────────────┐
│  Header: "Team" + "Invite Member" Button            │
├──────────────────┬──────────────────────────────────┤
│  Left Column     │  Right Column                    │
│  (Team List)     │  (Team Details)                  │
│                  │                                  │
│  - Search        │  Selected Team Info:             │
│  - New Team btn  │  - Name                          │
│  - Team items    │  - Description                   │
│                  │  - Member count                  │
│                  │  - Add Members button            │
│                  │  - Member list with remove       │
│                  │  - Edit/Delete team buttons      │
└──────────────────┴──────────────────────────────────┘
```

#### Left Column: Team List
- **Width**: Fixed 320px (w-80)
- **Header**:
  - Search input (filters teams by name)
  - "New Team" button (Owner/Admin only)
- **Team Items**:
  - Team name
  - Member count badge
  - Click to select and show details in right column
- **Empty State**:
  - "No teams yet. Create your first team to organize members."
  - Shows when no teams exist
- **Visibility**:
  - **Owner/Admin**: Sees all teams
  - **Member**: Sees only assigned teams

#### Right Column: Team Details
- **Width**: Flexible (flex-1)
- **Selected State**:
  - Team name (editable on click for Owner/Admin)
  - Team description (editable on click for Owner/Admin)
  - Member count: "5 members"
  - "Add Members" button (Owner/Admin only)
  - Member list:
    - Avatar (first letter of name)
    - Member name
    - Role badge (Owner/Admin/Member)
    - Remove icon (Owner/Admin only, not shown for Owner)
  - **Action Buttons** (bottom, Owner/Admin only):
    - "Edit Team" → Opens edit modal
    - "Delete Team" → Confirmation dialog
- **Empty State** (no team selected):
  - "Select a team to view details"
  - Icon with helpful message

### Team Creation Flow

**Trigger**: Click "New Team" button (left column)

**Modal Dialog**:
- Title: "Create New Team"
- Fields:
  - **Team Name** (required, text input, max 100 chars)
  - **Description** (optional, textarea, max 500 chars)
- Actions:
  - "Cancel" (closes modal)
  - "Create Team" (primary button)
- On submit:
  - Validate name not empty
  - Insert into `event_teams` table
  - Close modal
  - Select newly created team in left column
  - Show team details in right column

### Team Editing Flow

**Trigger**: Click "Edit Team" button (right column) OR click team name/description (inline edit)

**Edit Modal**:
- Same fields as creation modal
- Pre-filled with current values
- Title: "Edit Team"
- Actions:
  - "Cancel"
  - "Save Changes" (primary button)
- On submit:
  - Update `event_teams` table
  - Refresh team details

**Inline Edit** (alternative):
- Click team name → becomes editable input
- Click team description → becomes editable textarea
- Save on blur or Enter key
- Cancel on Escape key

### Team Deletion Flow

**Trigger**: Click "Delete Team" button (right column)

**Confirmation Dialog**:
- Title: "Delete Team"
- Message: "Are you sure you want to delete [Team Name]? Members will remain in the event but will be removed from this team."
- Actions:
  - "Cancel"
  - "Delete" (destructive, red button)
- On confirm:
  - Delete all `team_members` entries for this team
  - Delete `event_teams` record
  - Deselect team
  - Show empty state in right column

### Member Assignment Flow

**Trigger**: Click "Add Members" button (right column)

**Assignment Modal**:
- Title: "Add Members to [Team Name]"
- Member list with checkboxes:
  - Shows all event members
  - Checked if already on this team
  - Unchecked if not on team
  - Each row: checkbox, avatar, name, role badge
- Search input at top to filter members
- Actions:
  - "Cancel"
  - "Save" (primary button)
- On submit:
  - Compare current state vs selected state
  - Insert new `team_members` entries
  - Delete removed `team_members` entries
  - Use batch operations for efficiency
  - Close modal
  - Refresh team member list

### Member Removal from Team

**Trigger**: Click "X" icon next to member in team details

**Confirmation Dialog**:
- Title: "Remove Member"
- Message: "Remove [Member Name] from [Team Name]? They will remain in the event."
- Actions:
  - "Cancel"
  - "Remove" (destructive)
- On confirm:
  - Delete `team_members` entry
  - Refresh team member list
  - Update member count

### Empty States

| Location | Condition | Message | Action |
|----------|-----------|---------|--------|
| Left column | No teams exist | "No teams yet. Create your first team to organize members." | Show "New Team" button |
| Left column | No teams match search | "No teams found matching '[query]'." | Show clear search button |
| Right column | No team selected | "Select a team to view details." | None |
| Right column | Team has no members | "No members assigned yet." | Show "Add Members" button |
| Assignment modal | No members in event | "No members to add. Invite members first." | Show "Invite Member" link |

### Permission-Based Visibility

#### Owner/Admin View
- See all teams in left column
- Can create, edit, delete teams
- Can add/remove members from teams
- Can change member roles
- "New Team" button visible
- "Add Members" button visible
- "Edit Team" and "Delete Team" buttons visible
- Remove icons visible for all members except Owner

#### Member View
- See only assigned teams in left column
- Cannot create, edit, or delete teams
- Cannot add/remove members
- Cannot change roles
- "New Team" button hidden
- "Add Members" button hidden
- "Edit Team" and "Delete Team" buttons hidden
- Team details read-only

---

## Invite System Specification

### Invite Methods

#### 1. Email Invite

**Flow**:
1. Owner/Admin clicks "Invite Member" button (Team page header)
2. Dialog opens with two tabs: "Email Invite" and "Link Invite"
3. Email Invite tab selected by default
4. Enter email address in text input
5. Click "Send Invite"
6. System calls Supabase `auth.admin.inviteUserByEmail()`
7. Invite record created in `event_invites` table with:
   - `invite_type: 'email'`
   - `email: [entered email]`
   - `expires_at: now() + 48 hours`
8. Success message: "Invite sent to [email]"
9. Invitee receives Supabase Auth email with magic link
10. Clicking link:
    - Creates user in Supabase Auth (if new)
    - Adds to `event_members` table with role "Member"
    - Redirects to `/events/[eventId]/team`

**Validation**:
- Email format must be valid
- Email cannot already be an event member
- Maximum 50 pending invites per event

**Email Template** (Supabase default):
- Subject: "You've been invited to join [Event Name]"
- Body: Contains Supabase magic link
- No customization in MVP (use Supabase defaults)

#### 2. Link Invite

**Flow**:
1. Owner/Admin clicks "Invite Member" button
2. Dialog opens, selects "Link Invite" tab
3. Click "Generate New Link"
4. System creates `event_invites` record with:
   - `invite_type: 'link'`
   - `token: UUID v4`
   - `expires_at: now() + 48 hours`
5. Shareable URL displayed: `[app-domain]/invite/[token]`
6. "Copy Link" button copies URL to clipboard
7. Admin shares link externally
8. Anyone with link visits `/invite/[token]`
9. System validates token:
   - Exists in database
   - Not expired
   - Belongs to active event
10. If valid, user authenticates (login or signup)
11. On auth success:
    - Add to `event_members` table with role "Member"
    - Mark invite as used (`used_at` timestamp)
    - Redirect to `/events/[eventId]/team`

**Link Management**:
- Admins can generate multiple active links
- Each link has independent 48-hour expiry
- Links displayed in table with:
  - Creation date
  - Expiry date
  - Status (active/expired/used)
  - Copy button
  - Revoke button (deletes invite)
- "Generate New Link" always creates fresh link (doesn't replace existing)

**Validation**:
- Token must be valid UUID
- Token must not be expired
- Token must not already be used
- User cannot already be event member
- Maximum 10 active link invites per event

### Invite Page (`/invite/[token]`)

**Layout**: Centered card, no sidebar

**Valid Token State**:
- Event name and icon displayed
- Message: "You've been invited to join [Event Name]"
- "Accept Invite" button (redirects to Supabase Auth)

**Invalid Token State**:
- Error message: "This invite link is invalid or has expired."
- "Go to Events" button (redirects to homepage)

**Already Member State**:
- Message: "You're already a member of this event."
- "Go to Event" button (redirects to event workspace)

---

## Data Model and Supabase Schemas

### New Tables

#### `event_members`
Stores all members of an event with their roles.

```sql
create table event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(event_id, user_id)
);

create index idx_event_members_event on event_members(event_id);
create index idx_event_members_user on event_members(user_id);
```

**RLS Policies**:
```sql
-- Members can view other members in same event
create policy "Members can view event members"
  on event_members for select
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_members.event_id
      and em.user_id = auth.uid()
    )
  );

-- Owner and Admin can insert members
create policy "Owner and Admin can add members"
  on event_members for insert
  with check (
    exists (
      select 1 from event_members em
      where em.event_id = event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can update member roles
create policy "Owner and Admin can update members"
  on event_members for update
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_members.event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can remove members (except Owner)
-- Members can remove themselves
create policy "Members can leave, Admin can remove"
  on event_members for delete
  using (
    user_id = auth.uid() -- Can remove self
    or exists ( -- Or is Admin/Owner removing others
      select 1 from event_members em
      where em.event_id = event_members.event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );
```

#### `event_teams`
Stores teams within an event.

```sql
create table event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_name_length check (char_length(name) <= 100),
  constraint check_description_length check (char_length(description) <= 500)
);

create index idx_event_teams_event on event_teams(event_id);
```

**RLS Policies**:
```sql
-- Members can view teams (filtered in app layer by role)
create policy "Members can view event teams"
  on event_teams for select
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_teams.event_id
      and em.user_id = auth.uid()
    )
  );

-- Owner and Admin can create teams
create policy "Owner and Admin can create teams"
  on event_teams for insert
  with check (
    exists (
      select 1 from event_members em
      where em.event_id = event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can update teams
create policy "Owner and Admin can update teams"
  on event_teams for update
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_teams.event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can delete teams
create policy "Owner and Admin can delete teams"
  on event_teams for delete
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_teams.event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );
```

#### `team_members`
Junction table for member-to-team assignments.

```sql
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references event_teams(id) on delete cascade,
  member_id uuid not null references event_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),

  unique(team_id, member_id)
);

create index idx_team_members_team on team_members(team_id);
create index idx_team_members_member on team_members(member_id);
```

**RLS Policies**:
```sql
-- Members can view team assignments
create policy "Members can view team assignments"
  on team_members for select
  using (
    exists (
      select 1 from event_teams et
      join event_members em on em.event_id = et.event_id
      where et.id = team_members.team_id
      and em.user_id = auth.uid()
    )
  );

-- Owner and Admin can assign members
create policy "Owner and Admin can assign members"
  on team_members for insert
  with check (
    exists (
      select 1 from event_teams et
      join event_members em on em.event_id = et.event_id
      where et.id = team_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can remove assignments
create policy "Owner and Admin can remove assignments"
  on team_members for delete
  using (
    exists (
      select 1 from event_teams et
      join event_members em on em.event_id = et.event_id
      where et.id = team_members.team_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );
```

#### `event_invites`
Stores invite metadata for both email and link invites.

```sql
create table event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  invite_type text not null check (invite_type in ('email', 'link')),
  token uuid not null default gen_random_uuid(),
  email text, -- Only for email invites
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),

  constraint check_email_for_email_invite 
    check (invite_type != 'email' or email is not null)
);

create unique index idx_event_invites_token on event_invites(token);
create index idx_event_invites_event on event_invites(event_id);
create index idx_event_invites_expires on event_invites(expires_at);
```

**RLS Policies**:
```sql
-- Public can view valid invite info (for invite page)
create policy "Anyone can view valid invites"
  on event_invites for select
  using (
    expires_at > now()
    and used_at is null
  );

-- Owner and Admin can create invites
create policy "Owner and Admin can create invites"
  on event_invites for insert
  with check (
    exists (
      select 1 from event_members em
      where em.event_id = event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can update invites (mark as used)
create policy "Owner and Admin can update invites"
  on event_invites for update
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_invites.event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );

-- Owner and Admin can delete invites (revoke)
create policy "Owner and Admin can delete invites"
  on event_invites for delete
  using (
    exists (
      select 1 from event_members em
      where em.event_id = event_invites.event_id
      and em.user_id = auth.uid()
      and em.role in ('owner', 'admin')
    )
  );
```

### Database Triggers

#### Auto-create Owner as Event Member

```sql
create or replace function create_owner_member()
returns trigger as $$
begin
  insert into event_members (event_id, user_id, role)
  values (new.id, new.organizer_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_create_owner_member
  after insert on events
  for each row
  execute function create_owner_member();
```

This ensures every event creator is automatically added as the Owner in `event_members`.

#### Cleanup Expired Invites (Optional)

```sql
create or replace function cleanup_expired_invites()
returns void as $$
begin
  delete from event_invites
  where expires_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;

-- Schedule via pg_cron or external cron job
-- Not critical for MVP, can run manually
```

### Updated Existing Tables

#### `events` table
No schema changes required. Foreign key to `organizer_id` remains.

#### Migration Order
1. Create `event_members` table
2. Create trigger `create_owner_member`
3. Backfill existing events:
   ```sql
   insert into event_members (event_id, user_id, role)
   select id, organizer_id, 'owner'
   from events
   on conflict (event_id, user_id) do nothing;
   ```
4. Create `event_teams` table
5. Create `team_members` table
6. Create `event_invites` table

---

## Non-Functional Requirements

### Performance
- Team list queries must return in <500ms for events with 100+ members
- Member assignment modal must load in <300ms
- Invite link generation must be instant (<100ms)

### Security
- All RLS policies enforced at database level
- No direct member role escalation (Member → Owner)
- Invite tokens must be cryptographically secure (UUID v4)
- Expired invites cannot be used (validated server-side)

### Accessibility
- All modals keyboard navigable (Tab, Escape, Enter)
- Focus trap in open modals
- ARIA labels on all interactive elements
- Screen reader announcements for state changes

### Mobile Responsiveness
- Two-column layout stacks vertically on mobile (<768px)
- Team list becomes full-width with bottom sheet for details
- Touch targets minimum 44x44px
- Swipe gestures for mobile navigation

### Error Handling
- Network failures show toast notifications
- Form validation errors inline
- Failed invite sends retry option
- Database conflicts handled gracefully

---

## Open Questions and Decisions Needed

*All critical decisions have been answered. See updated AGENTS.md for decision log.*

---

## Success Criteria

### Functional Success
✅ Owner can invite members via email and link  
✅ Members can accept invites and join event  
✅ Owner/Admin can create, edit, delete teams  
✅ Owner/Admin can assign members to multiple teams  
✅ Members see only their assigned teams  
✅ Owner/Admin see all teams and members  
✅ Members can leave event voluntarily  
✅ Team member counts accurate in real-time  
✅ Invite links expire after 48 hours  

### Technical Success
✅ All database schemas migrated successfully  
✅ RLS policies prevent unauthorized access  
✅ No N+1 query issues in team/member lists  
✅ Invite system uses Supabase Auth primitives only  
✅ Full shadcn theme adherence  
✅ No console errors or warnings  

### UX Success
✅ Team creation takes <30 seconds  
✅ Member assignment takes <15 seconds  
✅ Empty states guide users to next action  
✅ Permission-based UI adapts correctly per role  
✅ Mobile layout usable on 375px viewport  

---

## Implementation Notes

### shadcn Components Used
- `Dialog` for modals (create team, edit team, assign members)
- `AlertDialog` for confirmations (delete team, remove member)
- `Input` for search and text fields
- `Textarea` for descriptions
- `Checkbox` for member selection
- `Button` with variants (default, destructive, ghost)
- `Badge` for role and member count
- `Avatar` for member display
- `Tabs` for invite dialog (email vs link)
- `Card` for team items and right column

### React Query Hooks
- `useEventMembers(eventId)` - Fetch all event members
- `useEventTeams(eventId)` - Fetch all teams (filtered by role in component)
- `useTeamMembers(teamId)` - Fetch members of specific team
- `useCreateTeam()` - Create new team
- `useUpdateTeam()` - Update team name/description
- `useDeleteTeam()` - Delete team
- `useAssignMembers()` - Batch add/remove team assignments
- `useCreateInvite()` - Create email or link invite
- `useEventInvites(eventId)` - Fetch active invites
- `useRevokeInvite()` - Delete invite record
- `useAcceptInvite(token)` - Validate and accept invite

### State Management
- Current team selection: Local component state
- Search filter: Local component state
- Sidebar and global UI: Zustand store (existing)
- Server data: React Query (existing pattern)

### API Routes (Next.js API routes)
- `POST /api/invites/email` - Send email invite
- `POST /api/invites/link` - Generate link invite
- `GET /api/invites/[token]` - Validate invite token
- `POST /api/invites/[token]/accept` - Accept invite

---

**End of PRD**
