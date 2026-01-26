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
  owner_id?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  lead_score?: number;
  last_engagement_score?: number;
  lifecycle_stage?: 'lead' | 'qualified' | 'customer' | 'champion';
}

export interface Conversation {
  id: string;
  contact_id: string;
  status: 'active' | 'archived' | 'closed';
  last_message_at: string;
  created_at: string;
  unread_count: number;
  status_type?: 'bot_active' | 'queued' | 'agent_active';
  assigned_agent_id?: string;
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

export interface Task {
  id: string;
  contact_id: string;
  due_date: string;
  status: 'pending' | 'completed';
  note?: string;
  assigned_to?: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  template_name: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  target_count: number;
  sent_count: number;
  created_at: string;
}

export interface AiSettings {
  id: string;
  company_name: string;
  tone: 'professional' | 'friendly' | 'formal';
  system_instructions?: string;
  created_at: string;
}

export interface Form {
  id: string;
  title: string;
  settings: any;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'agent';
  created_at: string;
}

// Extended types with relations
export interface ConversationWithContact extends Conversation {
  contact: Contact;
  last_message?: Message;
}
