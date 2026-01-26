'use server';

import { generateFlowFromDescription } from './ai-flow-builder';

export async function autopilotGenerateFlow(description: string) {
    try {
        const flow = await generateFlowFromDescription(description);
        return { success: true, flow };
    } catch (error: any) {
        console.error('[AutopilotAction] Error:', error);
        return { success: false, error: error.message };
    }
}
