'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Empty, Spin, Avatar } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput } from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { supabase, type Message as MessageType, type ConversationWithContact } from '@/lib/supabase';
import dayjs from 'dayjs';

interface MessageThreadProps {
    conversation: ConversationWithContact | null;
}

export default function MessageThread({ conversation }: MessageThreadProps) {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!conversation) {
            setMessages([]);
            return;
        }

        fetchMessages();

        // Real-time subscription
        const channel = supabase
            .channel(`messages_${conversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversation.id}`,
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as MessageType]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversation?.id]);

    async function fetchMessages() {
        if (!conversation) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversation.id)
                .order('timestamp', { ascending: true });

            if (error) throw error;

            setMessages(data || []);

            // Mark messages as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversation.id)
                .eq('sender', 'customer')
                .eq('is_read', false);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSend() {
        if (!conversation || !inputValue.trim()) return;

        setSending(true);
        try {
            const { error } = await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'agent',
                content: inputValue.trim(),
                is_read: true,
                platform: 'web',
            });

            if (error) throw error;

            setInputValue('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    }

    if (!conversation) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                <Empty description="Select a conversation to start messaging" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
                style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <Avatar icon={<UserOutlined />} size={40} />
                <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{conversation.contact?.name}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>{conversation.contact?.phone}</div>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <MainContainer>
                    <ChatContainer>
                        <MessageList>
                            {messages.map((msg) => (
                                <Message
                                    key={msg.id}
                                    model={{
                                        message: msg.content,
                                        sentTime: dayjs(msg.timestamp).format('HH:mm'),
                                        sender: msg.sender === 'agent' ? 'You' : conversation.contact?.name || 'Customer',
                                        direction: msg.sender === 'agent' ? 'outgoing' : 'incoming',
                                        position: 'single',
                                    }}
                                />
                            ))}
                        </MessageList>
                    </ChatContainer>
                </MainContainer>
            </div>

            {/* Input */}
            <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
                <Input.TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPressEnter={(e) => {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type a message..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    style={{ flex: 1 }}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    loading={sending}
                    disabled={!inputValue.trim()}
                >
                    Send
                </Button>
            </div>
        </div>
    );
}
