-- ============================================
-- Migration: Platform Enhancements
-- Date: 2026-01-17
-- Features:
--   1. Soft-delete for events (archived_at)
--   2. Platform users (sudo/admin roles)
--   3. Cities table (managed by sudo)
--   4. Role-based invites
--   5. Google Calendar integration fields
-- ============================================

BEGIN;

-- ============================================
-- 1. CITIES TABLE (Managed by Sudo)
-- ============================================

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- ============================================
-- 2. PLATFORM USERS TABLE (Sudo/Admin roles)
-- ============================================

CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('sudo', 'admin')),
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL, -- NULL for sudo, required for admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_users_user ON platform_users(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_city ON platform_users(city_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON platform_users(role);

-- Trigger for updated_at
CREATE TRIGGER update_platform_users_updated_at 
  BEFORE UPDATE ON platform_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. SOFT DELETE FOR EVENTS
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city_id);

-- ============================================
-- 4. UPDATE EVENT_INVITES WITH ROLE
-- ============================================

ALTER TABLE event_invites ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'viewer';

-- Update constraint to include the new role column validation
-- Note: Existing data will have 'viewer' as default role

-- ============================================
-- 5. GOOGLE CREDENTIALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS google_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  calendar_id TEXT, -- Primary calendar ID for sync
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_credentials_user ON google_credentials(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_google_credentials_updated_at 
  BEFORE UPDATE ON google_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. GOOGLE CALENDAR SYNC FIELDS
-- ============================================

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_meet_link TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);

-- ============================================
-- 7. HELPER FUNCTIONS FOR RBAC
-- ============================================

-- Check if user is a platform sudo
CREATE OR REPLACE FUNCTION public.is_platform_sudo(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_users
    WHERE user_id = p_user_id
      AND role = 'sudo'
  );
END;
$$;

-- Check if user is a platform admin (city-scoped)
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_users
    WHERE user_id = p_user_id
      AND role IN ('sudo', 'admin')
  );
END;
$$;

-- Check if user is admin for a specific city
CREATE OR REPLACE FUNCTION public.is_city_admin(p_user_id UUID, p_city_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_users
    WHERE user_id = p_user_id
      AND (role = 'sudo' OR (role = 'admin' AND city_id = p_city_id))
  );
END;
$$;

-- Get user's platform role
CREATE OR REPLACE FUNCTION public.get_platform_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role 
  FROM platform_users 
  WHERE user_id = p_user_id;
  
  RETURN v_role;
END;
$$;

-- ============================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Enable RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_credentials ENABLE ROW LEVEL SECURITY;

-- CITIES policies
CREATE POLICY "Anyone can view cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Sudo can manage cities" ON cities FOR ALL USING (is_platform_sudo(auth.uid()));

-- PLATFORM_USERS policies
CREATE POLICY "Users can view own platform role" ON platform_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sudo can view all platform users" ON platform_users FOR SELECT USING (is_platform_sudo(auth.uid()));
CREATE POLICY "Sudo can manage platform users" ON platform_users FOR ALL USING (is_platform_sudo(auth.uid()));

-- GOOGLE_CREDENTIALS policies
CREATE POLICY "Users can view own credentials" ON google_credentials FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own credentials" ON google_credentials FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 9. UPDATE EVENTS RLS FOR PLATFORM ADMINS
-- ============================================

-- Drop existing events policies and recreate with platform role checks
DROP POLICY IF EXISTS "Organizers can view own events" ON events;
DROP POLICY IF EXISTS "Organizers can create own events" ON events;
DROP POLICY IF EXISTS "Organizers can update own events" ON events;
DROP POLICY IF EXISTS "Organizers can delete own events" ON events;
DROP POLICY IF EXISTS "Members can view events" ON events;

-- Sudo can do everything
CREATE POLICY "Sudo can view all events" ON events FOR SELECT USING (is_platform_sudo(auth.uid()));
CREATE POLICY "Sudo can manage all events" ON events FOR ALL USING (is_platform_sudo(auth.uid()));

-- Platform admins can manage events in their city
CREATE POLICY "City admins can view city events" ON events FOR SELECT 
  USING (is_city_admin(auth.uid(), city_id));
CREATE POLICY "City admins can manage city events" ON events FOR ALL 
  USING (is_city_admin(auth.uid(), city_id));

-- Organizers (legacy) can manage own events
CREATE POLICY "Organizers can view own events" ON events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can create own events" ON events FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));
CREATE POLICY "Organizers can update own events" ON events FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM organizers WHERE id = events.organizer_id AND auth_user_id = auth.uid()));

-- Event members can view events they belong to
CREATE POLICY "Members can view events" ON events FOR SELECT 
  USING (is_event_member(id, auth.uid()));

-- Filter out archived events by default (non-archived only)
-- Note: This is handled in application layer, not RLS

COMMIT;
