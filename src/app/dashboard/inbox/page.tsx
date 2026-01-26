'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Input, Tabs, Badge, Avatar, List, Tag, Spin, Divider, Button, Space } from 'antd';
import { SearchOutlined, UserOutlined, RobotOutlined, ClockCircleOutlined, CheckCircleOutlined, FireOutlined, BulbOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase, ConversationWithContact } from '@/lib/supabase';
import { summarizeConversation } from '@/lib/services/handover';
import MessageThread from '@/components/MessageThread';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export default function InboxPage() {
    const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConversations();

        // Realtime subscription
        const subscription = supabase
            .channel('inbox-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                fetchConversations();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [activeTab]);

    async function fetchConversations() {
        // setLoading(true); // Don't block UI on refresh
        try {
            let query = supabase
                .from('conversations')
                .select('*, contacts(*)')
                .order('updated_at', { ascending: false });

            if (activeTab === 'queued') {
                query = query.eq('status_type', 'queued');
            } else if (activeTab === 'bot') {
                // Logic for bot conversations (status != queued AND status != agent_active? or just status_type = 'bot_active')
                // Assuming default is 'bot_active' or null
                query = query.eq('status_type', 'bot_active');
            } else if (activeTab === 'mine') {
                // query = query.eq('assigned_agent_id', auth.user.id)
                query = query.eq('status_type', 'agent_active'); // Simplified for MVP
            }

            const { data, error } = await query;
            if (error) throw error;
            setConversations(data || []);

            // If selected conversation updates, reflect changes
            if (selectedConversation) {
                const updated = data?.find(c => c.id === selectedConversation.id);
                if (updated) setSelectedConversation(updated);
            }

        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    }

    const items = [
        { key: 'all', label: 'Tümü' },
        { key: 'queued', label: <Badge status="error" text="Bekleyenler" /> },
        { key: 'mine', label: 'Bana Atanan' },
        { key: 'bot', label: <span style={{ color: '#aaa' }}><RobotOutlined /> Bot</span> },
    ];

    return (
        <div style={{ height: 'calc(100vh - 64px)', background: '#09090b', display: 'flex' }}>
            {/* LEFT COLUMN: List & Filters */}
            <div style={{
                width: 350,
                borderRight: 'var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--container-bg)'
            }}>
                <div style={{ padding: '16px 16px 0 16px' }}>
                    <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} size="small" />
                    <Input prefix={<SearchOutlined />} placeholder="Ara..." style={{ marginTop: 8, marginBottom: 16 }} />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <List
                        itemLayout="horizontal"
                        dataSource={conversations}
                        loading={loading}
                        renderItem={(item) => (
                            <List.Item
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    background: selectedConversation?.id === item.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    borderLeft: selectedConversation?.id === item.id ? '3px solid var(--primary)' : '3px solid transparent'
                                }}
                                onClick={() => setSelectedConversation(item)}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Badge count={item.status_type === 'queued' ? '!' : 0} size="small">
                                            <Avatar icon={<UserOutlined />} style={{ background: '#2563eb' }} />
                                        </Badge>
                                    }
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong style={{ color: 'var(--text-main)' }}>{item.contact?.name}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.created_at).fromNow(true)}</Text>
                                        </div>
                                    }
                                    description={
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.status_type === 'queued' ? <Text type="danger">Müşteri temsilcisi bekliyor</Text> : 'Mesaj içeriği...'}
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </div>
            </div>

            {/* MIDDLE COLUMN: Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
                {selectedConversation ? (
                    <>
                        <AIContextCard conversationId={selectedConversation.id} />
                        <MessageThread conversation={selectedConversation} />
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333' }}>
                        <RobotOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} />
                        <Text type="secondary">Bir sohbet seçin</Text>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: Customer Details & Sales Manager */}
            {selectedConversation && (
                <div style={{
                    width: 320,
                    borderLeft: 'var(--glass-border)',
                    background: 'var(--container-bg)',
                    padding: 24,
                    overflowY: 'auto'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Avatar size={64} icon={<UserOutlined />} style={{ background: '#7c3aed', marginBottom: 12 }} />
                        <Title level={4} style={{ margin: 0, color: 'var(--text-main)' }}>{selectedConversation.contact?.name}</Title>
                        <Text type="secondary">{selectedConversation.contact?.phone}</Text>

                        {/* 🎯 Lead Score Indicator */}
                        <div style={{ marginTop: 16 }}>
                            <Badge
                                count={`${selectedConversation.contact?.lead_score || 0}% Lead Score`}
                                style={{
                                    backgroundColor: (selectedConversation.contact?.lead_score || 0) > 70 ? '#52c41a' :
                                        (selectedConversation.contact?.lead_score || 0) > 30 ? '#faad14' : '#bfbfbf',
                                    borderRadius: 4,
                                    padding: '2px 10px',
                                    height: 'auto',
                                    lineHeight: '20px'
                                }}
                            />
                        </div>
                    </div>

                    <Divider style={{ borderColor: 'var(--glass-border)' }} />

                    {/* 🎟️ Ticket Management */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text strong style={{ color: 'var(--text-main)' }}>Açık Biletler</Text>
                            <Button size="small" type="primary" icon={<FireOutlined />}>Bilet Aç</Button>
                        </div>

                        <TicketList contactId={selectedConversation.contact_id} />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>Müşteri Sahnesi</Text>
                        <Tag color={
                            selectedConversation.contact?.lifecycle_stage === 'champion' ? 'gold' :
                                selectedConversation.contact?.lifecycle_stage === 'customer' ? 'green' :
                                    selectedConversation.contact?.lifecycle_stage === 'qualified' ? 'blue' : 'default'
                        }>
                            {selectedConversation.contact?.lifecycle_stage?.toUpperCase() || 'LEAD'}
                        </Tag>
                    </div>

                    {/* Meta Data */}
                    <div style={{ marginBottom: 24 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>Teknik Veriler</Text>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>ID:</Text>
                                <Text style={{ fontSize: 12 }}>{selectedConversation.contact_id.slice(0, 8)}...</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Status:</Text>
                                <Text style={{ fontSize: 12 }}>{selectedConversation.status_type}</Text>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mini Components (Internal for now)
const TicketList = ({ contactId }: { contactId: string }) => {
    const [tickets, setTickets] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('tickets').select('*').eq('contact_id', contactId).eq('status', 'open');
            setTickets(data || []);
        };
        fetch();
    }, [contactId]);

    if (tickets.length === 0) return <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>Açık bilet bulunmuyor.</Text>;

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            {tickets.map(t => (
                <div key={t.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Tag color={t.priority === 'urgent' ? 'red' : 'orange'} style={{ fontSize: 10 }}>{t.priority}</Tag>
                        <Text style={{ fontSize: 10, color: '#666' }}>{dayjs(t.created_at).format('DD MMM')}</Text>
                    </div>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{t.title}</Text>
                </div>
            ))}
        </Space>
    );
}

const AIContextCard = ({ conversationId }: { conversationId: string }) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchSummary = async () => {
        setLoading(true);
        const result = await summarizeConversation(conversationId);
        setSummary(result);
        setLoading(false);
    };

    useEffect(() => {
        fetchSummary();
    }, [conversationId]);

    if (!summary && !loading) return null;

    return (
        <div style={{
            padding: '12px 24px',
            background: 'rgba(56, 139, 255, 0.05)',
            borderBottom: '1px solid rgba(56, 139, 255, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            position: 'absolute',
            top: 72,
            left: 0,
            right: 0,
            zIndex: 10,
            backdropFilter: 'blur(10px)'
        }}>
            <BulbOutlined style={{ color: 'var(--primary)', marginTop: 4, fontSize: 16 }} />
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 12, color: 'var(--primary)', letterSpacing: 1 }}>AI ÖZETİ</Text>
                    <Button
                        size="small"
                        type="text"
                        icon={<ReloadOutlined style={{ fontSize: 12 }} />}
                        onClick={fetchSummary}
                        loading={loading}
                        style={{ height: 20, color: '#666' }}
                    />
                </div>
                <Text style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {loading ? <Spin size="small" /> : summary}
                </Text>
            </div>
        </div>
    );
};
