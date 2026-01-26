import { google } from './ai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Define the schema for our workflow nodes and edges to ensure compatibility with @xyflow/react
const WorkflowSchema = z.object({
    nodes: z.array(z.object({
        id: z.string(),
        type: z.enum(['trigger', 'message', 'question', 'delay', 'ai_agent', 'handover']),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.object({
            label: z.string(),
            content: z.string().optional(),
            variableName: z.string().optional(),
            delayDuration: z.number().optional(),
            delayUnit: z.enum(['m', 'h', 'd']).optional(),
        }),
    })),
    edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        animated: z.boolean().default(true),
    })),
});

export async function generateFlowFromDescription(description: string) {
    const { object } = await generateObject({
        model: google('gemini-1.5-flash'), // Optimized for free tier reliability
        schema: WorkflowSchema,
        system: `You are an expert WhatsApp Automation Architect. 
    Your task is to create a valid JSON workflow based on a user's verbal description. 
    
    Node Types Available:
    - message: Sends a text. Use 'content'.
    - question: Asks something and waits. Use 'content' and 'variableName'.
    - delay: Pauses. Use 'delayDuration' and 'delayUnit'.
    - ai_agent: AI reasoning node. Use 'content' for system instructions.
    - handover: Transfers to human.
    
    Guidelines:
    - Start node should always lead to subsequent logic.
    - Positions should be spaced out (e.g., node 1 at 0,0, node 2 at 250,0).
    - Ensure edges correctly connect the flow logic.
    - Use clear and professional labels.
    - If the user mentions scoring, use ai_agent node to implement it.`,
        prompt: description,
    });

    return object;
}
