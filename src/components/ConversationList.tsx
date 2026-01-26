'use client';

import React, { useEffect, useState } from 'react';
import { List, Avatar, Badge, Typography, Empty, Spin } from 'antd';
import { UserOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { supabase, type ConversationWithContact } from '@/lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface ConversationListProps {
    onSelectConversation: (conversation: ConversationWithContact) => void;
    selectedId?: string;
}

export default function ConversationList({
    onSelectConversation,
    selectedId,
}: ConversationListProps) {
    const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConversations();

        // Real-time subscription
        const channel = supabase
            .channel('conversations_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                },
                () => {
                    fetchConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchConversations() {
        try {
            // Fetch conversations with contacts
            const { data: convData, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('status', 'active')
                .order('last_message_at', { ascending: false });

            if (convError) throw convError;

            // Fetch contacts separately
            const contactIds = convData?.map((c) => c.contact_id) || [];
            const { data: contactData, error: contactError } = await supabase
                .from('contacts')
                .select('*')
                .in('id', contactIds);

            if (contactError) throw contactError;

            // Fetch last messages
            const conversationIds = convData?.map((c) => c.id) || [];
            const { data: messageData, error: messageError } = await supabase
                .from('messages')
                .select('*')
                .in('conversation_id', conversationIds)
                .order('timestamp', { ascending: false });

            if (messageError) throw messageError;

            // Combine data
            const enriched: ConversationWithContact[] =
                convData?.map((conv) => ({
                    ...conv,
                    contact: contactData?.find((c) => c.id === conv.contact_id)!,
                    last_message: messageData?.find((m) => m.conversation_id === conv.id),
                })) || [];

            setConversations(enriched);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <Empty
                description="Henüz konuşma yok"
                style={{ marginTop: 60 }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
        );
    }

    return (
        <List
            dataSource={conversations}
            renderItem={(item) => (
                <List.Item
                    onClick={() => onSelectConversation(item)}
                    style={{
                        cursor: 'pointer',
                        background: item.id === selectedId ? 'rgba(168, 199, 250, 0.1)' : 'transparent',
                        borderLeft: item.id === selectedId ? '3px solid var(--primary-pastel)' : '3px solid transparent',
                        padding: '12px 16px',
                        transition: 'all 0.2s ease'
                    }}
                    className="conversation-item"
                >
                    <List.Item.Meta
                        avatar={
                            <Badge count={item.unread_count} offset={[-5, 5]}>
                                <Avatar
                                    icon={item.last_message?.platform === 'whatsapp' ? <WhatsAppOutlined /> : <UserOutlined />}
                                    style={{
                                        background: item.last_message?.platform === 'whatsapp' ? '#25D366' : 'var(--primary-pastel)',
                                        color: item.last_message?.platform === 'whatsapp' ? '#fff' : 'rgba(0,0,0,0.8)'
                                    }}
                                />
                            </Badge>
                        }
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ color: 'var(--text-main)' }}>{item.contact?.name || 'Bilinmiyor'}</Text>
                                <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {dayjs(item.last_message_at).fromNow()}
                                </Text>
                            </div>
                        }
                        description={
                            <Text
                                ellipsis
                                style={{
                                    fontWeight: item.unread_count > 0 ? 600 : 400,
                                    color: item.unread_count > 0 ? 'var(--text-main)' : 'var(--text-secondary)'
                                }}
                            >
                                {item.last_message?.content || 'Henüz mesaj yok'}
                            </Text>
                        }
                    />
                </List.Item>

            )}
        />
    );
}
