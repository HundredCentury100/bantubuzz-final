-- ====================================================
-- Campaign Chat System Database Migration
-- Creates tables for campaign-level messaging between brands and creators
-- ====================================================

-- Table 1: campaign_chats
-- Stores chat conversations for campaigns
CREATE TABLE IF NOT EXISTS campaign_chats (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    chat_type VARCHAR(20) NOT NULL CHECK (chat_type IN ('broadcast', 'one_to_one')),
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table 2: campaign_chat_participants
-- Stores participants in each chat (brand and creators)
CREATE TABLE IF NOT EXISTS campaign_chat_participants (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES campaign_chats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('brand', 'creator')),
    is_muted BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(chat_id, user_id)
);

-- Table 3: campaign_chat_messages
-- Stores individual messages in chats
CREATE TABLE IF NOT EXISTS campaign_chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES campaign_chats(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('brand', 'creator')),
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_chats_campaign_id ON campaign_chats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_chats_updated_at ON campaign_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_chats_is_active ON campaign_chats(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON campaign_chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON campaign_chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_collaboration_id ON campaign_chat_participants(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_unread ON campaign_chat_participants(user_id, unread_count) WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON campaign_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON campaign_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON campaign_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted ON campaign_chat_messages(is_deleted) WHERE is_deleted = FALSE;

-- Trigger: Auto-update updated_at timestamp for campaign_chats
CREATE OR REPLACE FUNCTION update_campaign_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaign_chat_updated_at ON campaign_chats;
CREATE TRIGGER trigger_update_campaign_chat_updated_at
    BEFORE UPDATE ON campaign_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_chat_updated_at();

-- Trigger: Update chat last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update chat's last_message_at and preview
    UPDATE campaign_chats
    SET
        last_message_at = NEW.created_at,
        last_message_preview = CASE
            WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
            WHEN NEW.message_type = 'image' THEN '📷 Image'
            WHEN NEW.message_type = 'file' THEN '📎 File'
            WHEN NEW.message_type = 'system' THEN NEW.content
            ELSE 'Message'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.chat_id;

    -- Increment unread count for all participants except sender
    UPDATE campaign_chat_participants
    SET unread_count = unread_count + 1
    WHERE chat_id = NEW.chat_id
      AND user_id != NEW.sender_id
      AND left_at IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_last_message ON campaign_chat_messages;
CREATE TRIGGER trigger_update_chat_last_message
    AFTER INSERT ON campaign_chat_messages
    FOR EACH ROW
    WHEN (NEW.is_deleted = FALSE)
    EXECUTE FUNCTION update_chat_last_message();

-- Trigger: Reset unread count when participant reads messages
CREATE OR REPLACE FUNCTION reset_unread_on_read()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_read_at > OLD.last_read_at OR OLD.last_read_at IS NULL THEN
        NEW.unread_count = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_unread_on_read ON campaign_chat_participants;
CREATE TRIGGER trigger_reset_unread_on_read
    BEFORE UPDATE ON campaign_chat_participants
    FOR EACH ROW
    WHEN (NEW.last_read_at IS DISTINCT FROM OLD.last_read_at)
    EXECUTE FUNCTION reset_unread_on_read();

-- Function: Create a one-to-one chat between brand and creator
CREATE OR REPLACE FUNCTION create_one_to_one_chat(
    p_campaign_id INTEGER,
    p_brand_user_id INTEGER,
    p_creator_user_id INTEGER,
    p_collaboration_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_chat_id INTEGER;
    v_creator_name VARCHAR;
BEGIN
    -- Get creator name
    SELECT COALESCE(cp.display_name, u.email)
    INTO v_creator_name
    FROM users u
    LEFT JOIN creator_profiles cp ON cp.user_id = u.id
    WHERE u.id = p_creator_user_id;

    -- Check if chat already exists
    SELECT c.id INTO v_chat_id
    FROM campaign_chats c
    WHERE c.campaign_id = p_campaign_id
      AND c.chat_type = 'one_to_one'
      AND EXISTS (
          SELECT 1 FROM campaign_chat_participants
          WHERE chat_id = c.id AND user_id = p_brand_user_id
      )
      AND EXISTS (
          SELECT 1 FROM campaign_chat_participants
          WHERE chat_id = c.id AND user_id = p_creator_user_id
      );

    -- If chat doesn't exist, create it
    IF v_chat_id IS NULL THEN
        INSERT INTO campaign_chats (campaign_id, chat_type, title, is_active)
        VALUES (p_campaign_id, 'one_to_one', v_creator_name, TRUE)
        RETURNING id INTO v_chat_id;

        -- Add brand participant
        INSERT INTO campaign_chat_participants (chat_id, user_id, role, collaboration_id)
        VALUES (v_chat_id, p_brand_user_id, 'brand', NULL);

        -- Add creator participant
        INSERT INTO campaign_chat_participants (chat_id, user_id, role, collaboration_id)
        VALUES (v_chat_id, p_creator_user_id, 'creator', p_collaboration_id);
    END IF;

    RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create a broadcast chat for all campaign collaborators
CREATE OR REPLACE FUNCTION create_broadcast_chat(
    p_campaign_id INTEGER,
    p_brand_user_id INTEGER,
    p_title VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    v_chat_id INTEGER;
    v_collaboration RECORD;
BEGIN
    -- Create broadcast chat
    INSERT INTO campaign_chats (campaign_id, chat_type, title, is_active)
    VALUES (p_campaign_id, 'broadcast', COALESCE(p_title, 'Campaign Group Chat'), TRUE)
    RETURNING id INTO v_chat_id;

    -- Add brand participant
    INSERT INTO campaign_chat_participants (chat_id, user_id, role, collaboration_id)
    VALUES (v_chat_id, p_brand_user_id, 'brand', NULL);

    -- Add all active collaborators as participants
    -- Join through campaign_proposals to get collaborations for this campaign
    FOR v_collaboration IN
        SELECT c.id as collaboration_id, cp_profile.user_id as creator_user_id
        FROM collaborations c
        INNER JOIN campaign_proposals cp_app ON c.campaign_application_id = cp_app.id
        INNER JOIN creator_profiles cp_profile ON c.creator_id = cp_profile.id
        WHERE cp_app.campaign_id = p_campaign_id
          AND c.status = 'active'
    LOOP
        INSERT INTO campaign_chat_participants (chat_id, user_id, role, collaboration_id)
        VALUES (v_chat_id, v_collaboration.creator_user_id, 'creator', v_collaboration.collaboration_id)
        ON CONFLICT (chat_id, user_id) DO NOTHING;
    END LOOP;

    RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE campaign_chats IS 'Stores chat conversations for campaigns (broadcast or one-to-one)';
COMMENT ON TABLE campaign_chat_participants IS 'Tracks users participating in campaign chats';
COMMENT ON TABLE campaign_chat_messages IS 'Stores messages sent in campaign chats';

COMMENT ON COLUMN campaign_chats.chat_type IS 'Type: broadcast (all collaborators) or one_to_one (brand-creator)';
COMMENT ON COLUMN campaign_chats.last_message_preview IS 'Preview of last message for chat list display';
COMMENT ON COLUMN campaign_chat_participants.unread_count IS 'Number of unread messages for this participant';
COMMENT ON COLUMN campaign_chat_messages.read_by IS 'JSON array of user_ids who have read this message';

COMMENT ON FUNCTION create_one_to_one_chat IS 'Creates or retrieves one-to-one chat between brand and creator';
COMMENT ON FUNCTION create_broadcast_chat IS 'Creates broadcast chat for all campaign collaborators';
