import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { generateAIResponse } from './ai-agent';
import { createNotification } from './notifications';

// Types for our graph elements
interface Node {
    id: string;
    type: string;
    content: any;
    label: string;
}

interface Edge {
    source: string;
    target: string;
    sourceHandle?: string;
}

/**
 * Main entry point for incoming WhatsApp messages.
 */
export async function processWorkflowTrigger(message: string, contactId: string, fromPhone: string) {
    console.log(`[WorkflowEngine] Checking triggers for: "${message}"`);

    // 1. Check for Active Session first (resume)
    const { data: session } = await supabase
        .from('workflow_sessions')
        .select('*')
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (session && session.current_node_id) {
        console.log(`[WorkflowEngine] Resuming session: ${session.id} at node: ${session.current_node_id}`);
        await executeWorkflow(session.workflow_id, session.current_node_id, contactId, fromPhone, session.id, message);
        return 'resumed';
    }

    // 2. Find active workflows with matching keywords
    const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_active', true);

    if (error || !workflows) return null;

    for (const flow of workflows) {
        const { data: nodes } = await supabase
            .from('workflow_nodes')
            .select('*')
            .eq('workflow_id', flow.id)
            .eq('type', 'trigger')
            .single();

        if (!nodes) continue;

        const nodeData = nodes.content || {};
        const nodeKeywords = nodeData.keywords;
        let keywords: string[] = [];

        if (Array.isArray(nodeKeywords)) {
            keywords = nodeKeywords;
        } else if (typeof nodeKeywords === 'string') {
            keywords = nodeKeywords.split(',').map(k => k.trim());
        }

        const isMatch = keywords.some(k => message.toLowerCase().includes(k.toLowerCase()));

        if (isMatch) {
            console.log(`[WorkflowEngine] Match found! Executing flow: ${flow.name}`);

            // Create a new session
            const { data: newSession, error: sessionError } = await supabase
                .from('workflow_sessions')
                .insert({
                    contact_id: contactId,
                    workflow_id: flow.id,
                    current_node_id: nodes.id,
                    status: 'active'
                })
                .select()
                .single();

            if (sessionError) {
                console.error('[WorkflowEngine] Error creating session:', sessionError);
                return null;
            }

            await executeWorkflow(flow.id, nodes.id, contactId, fromPhone, newSession.id);
            return flow.name;
        }
    }

    // 3. GLOBAL FALLBACK: If no keyword matches, use AI Agent
    console.log(`[WorkflowEngine] No keyword match. Triggering Global AI Agent...`);
    const aiResponse = await generateAIResponse(message, contactId);
    if (aiResponse) {
        await sendWhatsAppMessage(fromPhone, aiResponse);

        // Log to Messages
        const conversationId = await getConversationId(contactId);
        if (conversationId) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                sender: 'agent',
                content: aiResponse,
                is_read: true,
                platform: 'whatsapp'
            });
        }
        return 'ai_fallback';
    }

    return null;
}

/**
 * Executes a workflow starting from a specific node.
 */
export async function executeWorkflow(workflowId: string, nodeId: string, contactId: string, fromPhone: string, sessionId?: string, userInput?: string) {
    const { data: nodes } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', workflowId);
    const { data: edges } = await supabase.from('workflow_edges').select('*').eq('workflow_id', workflowId);

    if (!nodes || !edges) return;

    let currentNodeId = nodeId;
    let isWaitingForInput = false;

    // Traversal logic
    while (currentNodeId && !isWaitingForInput) {
        const currentNode = nodes.find(n => n.id === currentNodeId);
        if (!currentNode) break;

        console.log(`[WorkflowEngine] Executing Node: ${currentNode.type} (${currentNode.label})`);

        let shouldMoveToNext = true;

        // NODE LOGIC
        switch (currentNode.type) {
            case 'message':
                const content = currentNode.content?.content || '';
                if (content) {
                    await sendWhatsAppMessage(fromPhone, content);
                }
                break;

            case 'question':
                // Check if we are resuming with input
                if (userInput) {
                    const variableName = currentNode.content?.variable_name;
                    if (variableName && sessionId) {
                        // Store variable in session
                        const { data: session } = await supabase.from('workflow_sessions').select('variables').eq('id', sessionId).single();
                        const newVars = { ...(session?.variables || {}), [variableName]: userInput };
                        await supabase.from('workflow_sessions').update({ variables: newVars }).eq('id', sessionId);

                        // 🎯 LEAD SCORING LOGIC
                        let scoreChange = 5; // Default score for answering
                        const lowerInput = userInput.toLowerCase();

                        // Example heuristics
                        if (lowerInput.includes('fiyat') || lowerInput.includes('bütçe') || lowerInput.includes('₺')) scoreChange += 15;
                        if (lowerInput.includes('acil') || lowerInput.includes('hemen') || lowerInput.includes('bugün')) scoreChange += 20;

                        await updateLeadScore(contactId, scoreChange);

                        // Special Case: Contact Name
                        if (variableName === 'contact_name') {
                            await supabase.from('contacts').update({ name: userInput }).eq('id', contactId);
                        }
                    }
                    userInput = undefined; // Consumed
                } else {
                    // Send the question and pause
                    const question = currentNode.content?.content || '';
                    if (question) await sendWhatsAppMessage(fromPhone, question);
                    isWaitingForInput = true;
                    shouldMoveToNext = false;
                }
                break;

            case 'ai_agent':
                // For AI Agent node, we can use the initial query or the current user input if we are in a loop
                const query = userInput || currentNode.content?.custom_query || 'Nasıl yardımcı olabilirim?';
                const aiResponse = await generateAIResponse(query, contactId);
                if (aiResponse) {
                    await sendWhatsAppMessage(fromPhone, aiResponse);
                }
                break;

            case 'handover':
                await supabase.from('conversations').update({ status_type: 'queued' }).eq('contact_id', contactId);

                // 🎟️ AUTO-TICKET GENERATION
                const { data: contact } = await supabase.from('contacts').select('name, lead_score').eq('id', contactId).single();
                const priority = (contact?.lead_score || 0) > 50 ? 'high' : 'medium';

                await supabase.from('tickets').insert({
                    contact_id: contactId,
                    status: 'open',
                    priority: priority,
                    title: `Handover: ${contact?.name || 'Bilinmeyen Müşteri'}`,
                    description: `Otomasyon üzerinden temsilciye aktarıldı. Lead Score: ${contact?.lead_score || 0}`
                });

                // 🔔 TRIGGER NOTIFICATION
                await createNotification({
                    title: '🔥 Yeni Destek Bileti',
                    message: `${contact?.name || 'Bir müşteri'} temsilciye aktarıldı. (Puan: ${contact?.lead_score || 0})`,
                    type: 'ticket',
                    link: '/inbox'
                });

                const handoverMsg = currentNode.content?.content || 'Sizi bir temsilciye aktarıyorum...';
                await sendWhatsAppMessage(fromPhone, handoverMsg);
                if (sessionId) await supabase.from('workflow_sessions').update({ status: 'completed' }).eq('id', sessionId);
                return; // Stop flow
        }

        if (shouldMoveToNext) {
            const nextEdges = edges.filter(e => e.source_node_id === currentNodeId);
            // In linear MVP, we just take the first edge. If branched, would need more complex logic.
            const nextEdge = nextEdges[0];

            if (nextEdge) {
                currentNodeId = nextEdge.target_node_id;
                if (sessionId) await supabase.from('workflow_sessions').update({ current_node_id: currentNodeId }).eq('id', sessionId);
            } else {
                // End of flow
                if (sessionId) await supabase.from('workflow_sessions').update({ status: 'completed' }).eq('id', sessionId);
                currentNodeId = '';
            }
        }
    }
}

/**
 * Helper to get conversation ID.
 */
async function getConversationId(contactId: string) {
    const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data?.id;
}

/**
 * Helper to update lead score and lifecycle stage.
 */
async function updateLeadScore(contactId: string, scoreChange: number) {
    const { data: contact } = await supabase
        .from('contacts')
        .select('lead_score')
        .eq('id', contactId)
        .single();

    if (!contact) return;

    const newScore = (contact.lead_score || 0) + scoreChange;
    let newStage = 'lead';
    if (newScore > 30) newStage = 'qualified';
    if (newScore > 80) {
        newStage = 'champion';
        // 🔔 TRIGGER NOTIFICATION FOR CHAMPION
        await createNotification({
            title: '🏆 Yeni Potansiyel Müşteri (Champion)',
            message: `Bir müşterinin puanı ${newScore} değerine ulaştı!`,
            type: 'lead',
            link: `/contacts`
        });
    }

    await supabase.from('contacts').update({
        lead_score: newScore,
        lifecycle_stage: newStage,
        last_engagement_score: scoreChange
    }).eq('id', contactId);
}
