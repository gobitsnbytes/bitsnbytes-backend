-- ============================================
-- FULL DATABASE SCHEMA (CLEAN SLATE)
-- Project: bitsnbytes-backend
-- Last Updated: 2026-01-04
-- Includes: Organizers, Events, Calendars, Tasks, Teams, and RLS Fixes
-- WARNING: This script will DROP existing tables to ensure a clean state.
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ============================================
-- 0. Cleanup (Optional, but ensures "proper schema" works)
-- ============================================

DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_columns CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS event_teams CASCADE;
DROP TABLE IF EXISTS event_invites CASCADE;
DROP TABLE IF EXISTS event_members CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS calendars CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS organizers CASCADE;

DROP TYPE IF EXISTS task_status CASCADE;

-- ============================================
-- 1. Custom Types
-- ============================================

CREATE TYPE task_status AS ENUM ('inbox', 'active', 'waiting', 'done');

-- ============================================
-- 2. Helper Functions (Security Definer)
-- These bypass RLS to avoid infinite recursion
-- ============================================

CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = p_event_id
      AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_event_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT event_id
  FROM event_members
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================
-- 3. Tables
-- ============================================

-- ORGANIZERS
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER_SETTINGS
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL UNIQUE REFERENCES organizers(id) ON DELETE CASCADE,
  theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  default_calendar_view TEXT NOT NULL DEFAULT 'week' CHECK (default_calendar_view IN ('day', 'week', 'month')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  start_date DATE,
  end_date DATE,
  icon TEXT DEFAULT '🎉',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_end_date_after_start_date CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- CALENDARS
CREATE TABLE calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f97316',
  is_default BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CALENDAR_EVENTS
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  location TEXT CHECK (location IS NULL OR char_length(location) <= 200),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_end_after_start CHECK (end_time >= start_time)
);

-- EVENT_MEMBERS
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- EVENT_TEAMS
CREATE TABLE event_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TEAM_MEMBERS
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES event_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, member_id)
);

-- EVENT_INVITES
CREATE TABLE event_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('email', 'link')),
  token UUID NOT NULL DEFAULT uuid_generate_v4(),
  email TEXT,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(token),
  CONSTRAINT check_email_for_email_invite CHECK (invite_type != 'email' OR email IS NOT NULL)
);

-- TASK_COLUMNS
CREATE TABLE task_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, order_index)
);

-- TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES task_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  owner_id UUID REFERENCES organizers(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'high')),
  due_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN DEFAULT false,
  assignee_id UUID REFERENCES event_members(id) ON DELETE SET NULL,
  assigner_id UUID REFERENCES event_members(id) ON DELETE SET NULL,
  team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL,
  status task_status DEFAULT 'inbox',
  waiting_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. Indexes
-- ============================================

CREATE INDEX idx_organizers_auth_user_id ON organizers(auth_user_id);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_calendars_event_id ON calendars(event_id);
CREATE INDEX idx_calendar_events_event_id ON calendar_events(event_id);
CREATE INDEX idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);
CREATE INDEX idx_event_teams_event ON event_teams(event_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_task_columns_event_id ON task_columns(event_id);
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);

-- ============================================
-- 5. Triggers and Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_organizers_updated_at BEFORE UPDATE ON organizers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_members_updated_at BEFORE UPDATE ON event_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_teams_updated_at BEFORE UPDATE ON event_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_columns_updated_at BEFORE UPDATE ON task_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Create Owner Membership (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION create_owner_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO event_members (event_id, user_id, role)
  SELECT NEW.id, o.auth_user_id, 'owner'
  FROM organizers o
  WHERE o.id = NEW.organizer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_owner_member
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_owner_member();

-- Function: Create Default Calendar (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION create_default_calendar_for_event()
RETURNS trigger AS $$
BEGIN
  INSERT INTO calendars (event_id, name, color, is_default)
  VALUES (NEW.id, 'Primary', '#f97316', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_default_calendar
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_default_calendar_for_event();

-- Function: Create Default Task Columns (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION create_default_task_columns_for_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_columns (event_id, name, order_index)
  VALUES 
    (NEW.id, 'Not Started', 0),
    (NEW.id, 'In Progress', 1),
    (NEW.id, 'Done', 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_default_task_columns
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_default_task_columns_for_event();

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ORGANIZERS
CREATE POLICY "Organizers can view own profile by UID or email" ON organizers FOR SELECT USING (auth.uid() = auth_user_id OR auth.jwt() ->> 'email' = email);
CREATE POLICY "Organizers can update own profile by UID or email" ON organizers FOR UPDATE USING (auth.uid() = auth_user_id OR auth.jwt() ->> 'email' = email);
CREATE POLICY "Organizers can create own profile" ON organizers FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- USER_SETTINGS
CREATE POLICY "Organizers can view own settings" ON user_settings FOR SELECT USING (EXISTS (SELECT 1 FROM organizers WHERE id = user_settings.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can update own settings" ON user_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM organizers WHERE id = user_settings.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can insert own settings" ON user_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organizers WHERE id = user_settings.organizer_id AND auth_user_id = auth.uid()));

-- EVENTS
CREATE POLICY "Organizers can view own events" ON events FOR SELECT USING (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can create own events" ON events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can update own events" ON events FOR UPDATE USING (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can delete own events" ON events FOR DELETE USING (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));
-- Also allow members to view events
CREATE POLICY "Members can view events" ON events FOR SELECT USING (is_event_member(id, auth.uid()));

-- CALENDARS
CREATE POLICY "Members can view calendars" ON calendars FOR SELECT USING (is_event_member(event_id, auth.uid()) OR EXISTS (SELECT 1 FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.id = calendars.event_id AND o.auth_user_id = auth.uid()));
CREATE POLICY "Admins can manage calendars" ON calendars FOR ALL USING (is_event_admin(event_id, auth.uid()) OR EXISTS (SELECT 1 FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.id = calendars.event_id AND o.auth_user_id = auth.uid()));

-- CALENDAR_EVENTS
CREATE POLICY "Members can view calendar events" ON calendar_events FOR SELECT USING (is_event_member(event_id, auth.uid()) OR EXISTS (SELECT 1 FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.id = calendar_events.event_id AND o.auth_user_id = auth.uid()));
CREATE POLICY "Admins can manage calendar events" ON calendar_events FOR ALL USING (is_event_admin(event_id, auth.uid()) OR EXISTS (SELECT 1 FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.id = calendar_events.event_id AND o.auth_user_id = auth.uid()));

-- EVENT_MEMBERS
CREATE POLICY "Members can view event members" ON event_members FOR SELECT USING (user_id = auth.uid() OR is_event_member(event_id, auth.uid()));
CREATE POLICY "Admins can manage members" ON event_members FOR ALL USING (is_event_admin(event_id, auth.uid()));
CREATE POLICY "System can add initial member" ON event_members FOR INSERT WITH CHECK (NOT EXISTS (SELECT 1 FROM event_members em WHERE em.event_id = event_members.event_id) OR is_event_admin(event_id, auth.uid()));

-- EVENT_TEAMS
CREATE POLICY "Members can view teams" ON event_teams FOR SELECT USING (is_event_member(event_id, auth.uid()));
CREATE POLICY "Admins can manage teams" ON event_teams FOR ALL USING (is_event_admin(event_id, auth.uid()));

-- TEAM_MEMBERS
CREATE POLICY "Members can view team members" ON team_members FOR SELECT USING (EXISTS (SELECT 1 FROM event_teams et WHERE et.id = team_members.team_id AND is_event_member(et.event_id, auth.uid())));
CREATE POLICY "Admins can manage team members" ON team_members FOR ALL USING (EXISTS (SELECT 1 FROM event_teams et WHERE et.id = team_members.team_id AND is_event_admin(et.event_id, auth.uid())));

-- EVENT_INVITES
CREATE POLICY "Anyone can view valid invites" ON event_invites FOR SELECT USING (expires_at > now() AND used_at IS NULL);
CREATE POLICY "Admins can manage invites" ON event_invites FOR ALL USING (is_event_admin(event_id, auth.uid()));
CREATE POLICY "Users can mark invites as used" ON event_invites FOR UPDATE USING (auth.uid() IS NOT NULL AND expires_at > now() AND used_at IS NULL) WITH CHECK (used_at IS NOT NULL);

-- TASK_COLUMNS
CREATE POLICY "Members can view columns" ON task_columns FOR SELECT USING (is_event_member(event_id, auth.uid()));
CREATE POLICY "Admins can manage columns" ON task_columns FOR ALL USING (is_event_admin(event_id, auth.uid()));

-- TASKS
CREATE POLICY "Members can view tasks" ON tasks FOR SELECT USING (is_event_member(event_id, auth.uid()));
CREATE POLICY "Members can manage tasks" ON tasks FOR ALL USING (is_event_member(event_id, auth.uid()));

COMMIT;
