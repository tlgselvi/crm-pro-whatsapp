'use server';

import { supabase } from './supabase';
import { processWorkflowTrigger } from './workflow-engine';

export async function simulateMessage(message: string, contactId: string) {
    const responses: string[] = [];

    // Custom handler that just pushes to our local array instead of calling WhatsApp
    const simulatorHandler = async (to: string, msg: string) => {
        responses.push(msg);
        return { success: true };
    };

    try {
        // We use a dummy phone for the simulator
        const result = await processWorkflowTrigger(message, contactId, 'SIMULATOR_PHONE', simulatorHandler);

        // Fetch updated contact info to show score changes
        const { data: contact } = await supabase
            .from('contacts')
            .select('lead_score, lifecycle_stage')
            .eq('id', contactId)
            .single();

        return {
            success: true,
            responses,
            triggerResult: result,
            updatedContact: contact
        };
    } catch (error: any) {
        console.error('[SimulatorAction] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getOrCreateTestContact() {
    const TEST_PHONE = 'SIMULATOR_TEST';

    const { data: existing } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone', TEST_PHONE)
        .single();

    if (existing) return existing;

    const { data: created, error } = await supabase
        .from('contacts')
        .insert([{
            name: 'Test Kullanıcısı',
            phone: TEST_PHONE,
            stage: 'new',
            lead_score: 0,
            lifecycle_stage: 'lead'
        }])
        .select()
        .single();

    if (error) throw error;
    return created;
}

export async function resetTestContact(contactId: string) {
    await supabase.from('workflow_sessions').delete().eq('contact_id', contactId);
    await supabase.from('contacts').update({ lead_score: 0, lifecycle_stage: 'lead', stage: 'new' }).eq('id', contactId);
    return { success: true };
}
