-- Event Distribution Architecture Migration
-- Sudo creates events → pushes to cities → city admins accept/ignore

-- Add instance status enum
DO $$ BEGIN
    CREATE TYPE event_instance_status AS ENUM ('pending', 'accepted', 'ignored');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add columns to events table for template/instance relationship
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS instance_status event_instance_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id);

-- Create index for parent-child relationship
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Create index for finding pending instances
CREATE INDEX IF NOT EXISTS idx_events_instance_status ON events(instance_status) WHERE instance_status IS NOT NULL;

-- Update existing events: mark all current events as templates (created by whoever)
-- This is safe for migration - existing events become templates
UPDATE events SET is_template = true WHERE is_template IS NULL OR is_template = false;

-- ============================================
-- HELPER FUNCTIONS FOR EVENT DISTRIBUTION
-- ============================================

-- Check if user is sudo
CREATE OR REPLACE FUNCTION is_sudo()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_users
        WHERE user_id = auth.uid()
        AND role = 'sudo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is city admin for a specific city
CREATE OR REPLACE FUNCTION is_city_admin(city_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_users
        WHERE user_id = auth.uid()
        AND role = 'admin'
        AND city_id = city_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's city_id (for admins)
CREATE OR REPLACE FUNCTION get_user_city_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT city_id FROM platform_users
        WHERE user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION TO PUSH EVENT TO CITIES
-- ============================================

CREATE OR REPLACE FUNCTION push_event_to_cities(
    template_event_id UUID,
    target_city_ids UUID[]
)
RETURNS SETOF events AS $$
DECLARE
    template_event events%ROWTYPE;
    city_id UUID;
    new_event events%ROWTYPE;
BEGIN
    -- Verify caller is sudo
    IF NOT is_sudo() THEN
        RAISE EXCEPTION 'Only sudo users can push events to cities';
    END IF;

    -- Get the template event
    SELECT * INTO template_event FROM events WHERE id = template_event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template event not found';
    END IF;

    -- Ensure it's marked as template
    UPDATE events SET is_template = true WHERE id = template_event_id;

    -- Create instance for each city
    FOREACH city_id IN ARRAY target_city_ids
    LOOP
        -- Check if instance already exists for this city
        IF NOT EXISTS (
            SELECT 1 FROM events 
            WHERE parent_event_id = template_event_id 
            AND events.city_id = city_id
        ) THEN
            INSERT INTO events (
                name,
                description,
                icon,
                venue,
                start_date,
                end_date,
                organizer_id,
                city_id,
                is_template,
                parent_event_id,
                instance_status
            )
            VALUES (
                template_event.name,
                template_event.description,
                template_event.icon,
                template_event.venue,
                template_event.start_date,
                template_event.end_date,
                template_event.organizer_id,
                city_id,
                false,  -- Not a template
                template_event_id,  -- Link to parent
                'pending'  -- Awaiting city admin acceptance
            )
            RETURNING * INTO new_event;
            
            RETURN NEXT new_event;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION TO ACCEPT/IGNORE EVENT INSTANCE
-- ============================================

CREATE OR REPLACE FUNCTION accept_event_instance(event_id UUID)
RETURNS events AS $$
DECLARE
    event_record events%ROWTYPE;
BEGIN
    -- Get the event
    SELECT * INTO event_record FROM events WHERE id = event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    -- Verify it's a pending instance
    IF event_record.instance_status != 'pending' THEN
        RAISE EXCEPTION 'Event is not pending';
    END IF;
    
    -- Verify caller is admin for this city
    IF NOT is_sudo() AND NOT is_city_admin(event_record.city_id) THEN
        RAISE EXCEPTION 'Not authorized to accept this event';
    END IF;
    
    -- Accept the event
    UPDATE events 
    SET 
        instance_status = 'accepted',
        accepted_at = NOW(),
        accepted_by = auth.uid()
    WHERE id = event_id
    RETURNING * INTO event_record;
    
    -- Create the owner membership for the accepting user
    INSERT INTO event_members (event_id, user_id, role)
    VALUES (event_id, auth.uid(), 'owner')
    ON CONFLICT DO NOTHING;
    
    RETURN event_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ignore_event_instance(event_id UUID)
RETURNS events AS $$
DECLARE
    event_record events%ROWTYPE;
BEGIN
    SELECT * INTO event_record FROM events WHERE id = event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    IF event_record.instance_status != 'pending' THEN
        RAISE EXCEPTION 'Event is not pending';
    END IF;
    
    IF NOT is_sudo() AND NOT is_city_admin(event_record.city_id) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    UPDATE events 
    SET instance_status = 'ignored'
    WHERE id = event_id
    RETURNING * INTO event_record;
    
    RETURN event_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore ignored event back to pending
CREATE OR REPLACE FUNCTION restore_ignored_event(event_id UUID)
RETURNS events AS $$
DECLARE
    event_record events%ROWTYPE;
BEGIN
    SELECT * INTO event_record FROM events WHERE id = event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    IF event_record.instance_status != 'ignored' THEN
        RAISE EXCEPTION 'Event is not ignored';
    END IF;
    
    IF NOT is_sudo() AND NOT is_city_admin(event_record.city_id) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    UPDATE events 
    SET instance_status = 'pending'
    WHERE id = event_id
    RETURNING * INTO event_record;
    
    RETURN event_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;

-- SELECT: 
-- Sudo sees all
-- City admin sees: templates OR their city's instances
-- Regular users see events they're members of
CREATE POLICY "events_select_policy" ON events FOR SELECT USING (
    is_sudo()
    OR (
        is_city_admin(city_id) 
        AND (is_template = true OR city_id = get_user_city_id())
    )
    OR EXISTS (
        SELECT 1 FROM event_members 
        WHERE event_members.event_id = events.id 
        AND event_members.user_id = auth.uid()
    )
);

-- INSERT: Only sudo can create template events
CREATE POLICY "events_insert_policy" ON events FOR INSERT WITH CHECK (
    is_sudo()
);

-- UPDATE: Sudo can update all, city admin can update their accepted instances
CREATE POLICY "events_update_policy" ON events FOR UPDATE USING (
    is_sudo()
    OR (
        is_city_admin(city_id) 
        AND instance_status = 'accepted'
        AND city_id = get_user_city_id()
    )
);
