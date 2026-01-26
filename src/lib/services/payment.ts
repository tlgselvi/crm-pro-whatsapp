import { supabase } from '../supabase';

/**
 * Creates a payment record and returns a mock payment link.
 * In production, this would integrate with Stripe, Iyzico, or similar.
 */
export async function createPaymentLink(
    contactId: string,
    amount: number,
    description: string
): Promise<{ url: string, error?: string }> {
    try {
        // 1. Generate a mock external link (e.g., /checkout/[id])
        const mockId = Math.random().toString(36).substring(7);
        const mockUrl = `https://checkout.crmpro.ai/${mockId}?amount=${amount}&desc=${encodeURIComponent(description)}`;

        // 2. Record the transaction in the 'sales' table
        const { error } = await supabase.from('sales').insert({
            contact_id: contactId,
            amount: amount,
            description: description,
            status: 'pending',
            external_link: mockUrl
        });

        if (error) throw error;

        return { url: mockUrl };
    } catch (err: any) {
        console.error('[PaymentService] Error creating payment link:', err);
        return { url: '', error: err.message };
    }
}
