import { supabase } from './supabase';

export type NotificationType = 'ticket' | 'lead' | 'system';

export async function createNotification(params: {
    userId?: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
}) {
    // If no userId provided, target the first admin/agent found or just broadcast (null userId in some cases)
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('notifications').insert({
        user_id: params.userId || user?.id,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link
    });

    if (error) {
        console.error('[NotificationService] Error creating notification:', error);
    }
}

export async function getUnreadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[NotificationService] Error fetching notifications:', error);
        return [];
    }

    return data;
}
