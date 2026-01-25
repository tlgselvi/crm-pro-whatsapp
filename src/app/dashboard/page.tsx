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
    const [stats, setStats] = useState<DashboardStats>({
        totalContacts: 0,
        activeConversations: 0,
        totalMessages: 0,
        avgResponseTime: '0m',
    });
    const [recentMessages, setRecentMessages] = useState<any[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
        fetchRecentMessages();
        fetchUpcomingTasks();
    }, []);

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

            setStats({
                totalContacts: contactCount || 0,
                activeConversations: convCount || 0,
                totalMessages: msgCount || 0,
                avgResponseTime: '5m', // Placeholder
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
                <Title level={2} className="text-gradient" style={{ margin: 0 }}>Sistem Özeti</Title>
                <Text type="secondary" style={{ fontSize: 16 }}>İşletmenizin anlık performans verileri.</Text>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card" variant="borderless">
                        <Statistic
                            title={<Text strong style={{ color: '#64748b' }}>Toplam Müşteri</Text>}
                            value={stats.totalContacts}
                            prefix={<UserOutlined style={{ padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, color: '#3b82f6' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card" variant="borderless">
                        <Statistic
                            title={<Text strong style={{ color: '#64748b' }}>Aktif Sohbet</Text>}
                            value={stats.activeConversations}
                            prefix={<MessageOutlined style={{ padding: 8, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, color: '#10b981' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card" variant="borderless">
                        <Statistic
                            title={<Text strong style={{ color: '#64748b' }}>Mesaj Trafiği</Text>}
                            value={stats.totalMessages}
                            prefix={<CheckCircleOutlined style={{ padding: 8, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 12, color: '#8b5cf6' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card" variant="borderless">
                        <Statistic
                            title={<Text strong style={{ color: '#64748b' }}>Yanıt Hızı</Text>}
                            value={stats.avgResponseTime}
                            prefix={<ClockCircleOutlined style={{ padding: 8, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, color: '#f59e0b' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}
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
