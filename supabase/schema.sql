-- Kommo CRM Clone - Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('customer', 'agent')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    platform VARCHAR(20) DEFAULT 'web' CHECK (platform IN ('whatsapp', 'web', 'internal'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- Enable real-time for all tables
ALTER TABLE contacts REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Enable Row Level Security (RLS) - Currently permissive for MVP
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (MVP - change for production)
CREATE POLICY "Enable all operations for contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation's last_message_at when new message arrives
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.timestamp,
        unread_count = CASE 
            WHEN NEW.sender = 'customer' AND NOT NEW.is_read THEN unread_count + 1 
            ELSE unread_count 
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation when message is added
CREATE TRIGGER update_conversation_on_message AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to reset unread count when messages are marked as read
CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        UPDATE conversations 
        SET unread_count = GREATEST(0, unread_count - 1)
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to decrement unread count
CREATE TRIGGER decrement_unread_on_read AFTER UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION reset_unread_count();

-- Sample data for testing (optional)
INSERT INTO contacts (name, phone, email) VALUES 
    ('Test Customer', '+905551234567', 'test@example.com'),
    ('Demo User', '+905559876543', 'demo@example.com')
ON CONFLICT (phone) DO NOTHING;
