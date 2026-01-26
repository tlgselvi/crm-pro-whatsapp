import { supabase } from '@/lib/supabase';

export interface WorkflowSession {
    id: string;
    contact_id: string;
    workflow_id: string;
    current_node_id: string | null;
    status: 'active' | 'paused' | 'completed';
    variables: Record<string, any>;
    metadata: Record<string, any>;
}

export class SessionManager {
    /**
     * Get active session for a contact
     */
    static async getActiveSession(contactId: string): Promise<WorkflowSession | null> {
        const { data, error } = await supabase
            .from('workflow_sessions')
            .select('*')
            .eq('contact_id', contactId)
            .eq('status', 'active')
            .single();

        if (error) return null;
        return data;
    }

    /**
     * Start a new session for a workflow
     */
    static async startSession(contactId: string, workflowId: string, startNodeId: string): Promise<WorkflowSession> {
        // Close any existing active sessions to prevent conflicts
        await supabase
            .from('workflow_sessions')
            .update({ status: 'completed' })
            .eq('contact_id', contactId)
            .eq('status', 'active');

        const { data, error } = await supabase
            .from('workflow_sessions')
            .insert({
                contact_id: contactId,
                workflow_id: workflowId,
                current_node_id: startNodeId,
                status: 'active',
                variables: {},
                metadata: {}
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to start session: ${error.message}`);
        return data;
    }

    /**
     * Update session state (move to next node, update variables)
     */
    static async updateSession(sessionId: string, updates: Partial<WorkflowSession>) {
        const { data, error } = await supabase
            .from('workflow_sessions')
            .update(updates)
            .eq('id', sessionId)
            .select()
            .single();

        if (error) throw new Error(`Failed to update session: ${error.message}`);
        return data;
    }

    /**
     * Complete a session
     */
    static async completeSession(sessionId: string) {
        return this.updateSession(sessionId, { status: 'completed', current_node_id: null });
    }
}
