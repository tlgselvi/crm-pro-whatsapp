import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);


// Database types
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  status: 'active' | 'archived' | 'closed';
  last_message_at: string;
  created_at: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'customer' | 'agent';
  content: string;
  timestamp: string;
  is_read: boolean;
  platform: 'whatsapp' | 'web' | 'internal';
  media_url?: string;
  media_type?: string;
}

export interface Broadcast {
  id: string;
  name: string;
  content: string;
  target_stage: string;
  status: string;
  created_at: string;
}

// Extended types with relations
export interface ConversationWithContact extends Conversation {
  contact: Contact;
  last_message?: Message;
}
