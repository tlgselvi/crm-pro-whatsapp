'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Typography, Badge } from 'antd';
import { MessageOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface DashboardStats {
    totalContacts: number;
    activeConversations: number;
    totalMessages: number;
    avgResponseTime: string;
}

export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState<DashboardStats>({
        totalContacts: 0,
        activeConversations: 0,
        totalMessages: 0,
        avgResponseTime: '0m',
    });
    const [recentMessages, setRecentMessages] = useState<any[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        fetchStats();
        fetchRecentMessages();
        fetchUpcomingTasks();
    }, []);

    if (!mounted) return null;

    async function fetchStats() {
        try {
            // Total contacts
            const { count: contactCount } = await supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true });

            // Active conversations
            const { count: convCount } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            // Total messages
            const { count: msgCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true });

            // Calculate Avg Response Time
            let avgTime = '0m';
            const { data: messages } = await supabase
                .from('messages')
                .select('timestamp, sender, conversation_id')
                .order('timestamp', { ascending: true })
                .limit(1000); // Analyze last 1000 messages for performance

            if (messages && messages.length > 0) {
                let totalResponseTime = 0;
                let responseCount = 0;
                const lastCustomerMsg: { [key: string]: string } = {};

                messages.forEach(msg => {
                    if (msg.sender === 'customer') {
                        lastCustomerMsg[msg.conversation_id] = msg.timestamp;
                    } else if (msg.sender === 'agent' && lastCustomerMsg[msg.conversation_id]) {
                        const start = dayjs(lastCustomerMsg[msg.conversation_id]);
                        const end = dayjs(msg.timestamp);
                        const diffInMinutes = end.diff(start, 'minute');
                        if (diffInMinutes >= 0 && diffInMinutes < 60 * 24) { // Filter outliers > 24h
                            totalResponseTime += diffInMinutes;
                            responseCount++;
                        }
                        delete lastCustomerMsg[msg.conversation_id];
                    }
                });

                if (responseCount > 0) {
                    const avg = Math.round(totalResponseTime / responseCount);
                    avgTime = avg < 60 ? `${avg}dk` : `${Math.floor(avg / 60)}s ${avg % 60}dk`;
                }
            }

            setStats({
                totalContacts: contactCount || 0,
                activeConversations: convCount || 0,
                totalMessages: msgCount || 0,
                avgResponseTime: avgTime,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    async function fetchRecentMessages() {
        try {
            const { data } = await supabase
                .from('messages')
                .select('*, conversations(*, contacts(*))')
                .order('timestamp', { ascending: false })
                .limit(5);

            setRecentMessages(data || []);
        } catch (error) {
            console.error('Error fetching recent messages:', error);
        }
    }

    async function fetchUpcomingTasks() {
        try {
            const { data } = await supabase
                .from('tasks')
                .select('*, contacts(*)')
                .eq('status', 'pending')
                .gte('due_date', new Date().toISOString())
                .order('due_date', { ascending: true })
                .limit(5);

            setUpcomingTasks(data || []);
        } catch (error) {
            console.error('Error fetching upcoming tasks:', error);
        }
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 0' }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Sistem Özeti</Title>
                <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>İşletmenizin anlık performans verileri.</Text>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless">
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)' }}>Toplam Müşteri</Text>}
                            value={stats.totalContacts}
                            prefix={<UserOutlined style={{ padding: 8, background: 'rgba(168, 199, 250, 0.1)', borderRadius: 12, color: 'var(--primary-pastel)' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 500, color: 'var(--text-main)' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless">
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)' }}>Aktif Sohbet</Text>}
                            value={stats.activeConversations}
                            prefix={<MessageOutlined style={{ padding: 8, background: 'rgba(168, 199, 250, 0.1)', borderRadius: 12, color: 'var(--primary-pastel)' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 500, color: 'var(--text-main)' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless">
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)' }}>Mesaj Trafiği</Text>}
                            value={stats.totalMessages}
                            prefix={<CheckCircleOutlined style={{ padding: 8, background: 'rgba(168, 199, 250, 0.1)', borderRadius: 12, color: 'var(--primary-pastel)' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 500, color: 'var(--text-main)' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless">
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)' }}>Yanıt Hızı</Text>}
                            value={stats.avgResponseTime}
                            prefix={<ClockCircleOutlined style={{ padding: 8, background: 'rgba(168, 199, 250, 0.1)', borderRadius: 12, color: 'var(--primary-pastel)' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 500, color: 'var(--text-main)' }}
                        />
                    </Card>
                </Col>
            </Row>


            <Row gutter={16}>
                <Col span={12}>
                    <Card title="Son Mesajlar" variant="borderless">
                        <List
                            dataSource={recentMessages}
                            renderItem={(item: any) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={item.conversations?.contacts?.name || 'Bilinmiyor'}
                                        description={item.content}
                                    />
                                    <div>{dayjs(item.timestamp).fromNow()}</div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Günü Gelen Görevler" variant="borderless" extra={<Badge count={upcomingTasks.length} />}>
                        <List
                            dataSource={upcomingTasks}
                            renderItem={(item: any) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                                        title={item.contacts?.name || 'İsimsiz'}
                                        description={item.note}
                                    />
                                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                        {dayjs(item.due_date).format('DD MMM HH:mm')}
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
