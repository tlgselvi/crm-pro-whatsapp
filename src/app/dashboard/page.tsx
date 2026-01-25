'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Typography, Badge } from 'antd';
import { MessageOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title } = Typography;

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
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Panel</Title>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card variant="outlined">
                        <Statistic
                            title="Toplam Kişi"
                            value={stats.totalContacts}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card variant="outlined">
                        <Statistic
                            title="Aktif Konuşmalar"
                            value={stats.activeConversations}
                            prefix={<MessageOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card variant="outlined">
                        <Statistic
                            title="Toplam Mesaj"
                            value={stats.totalMessages}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card variant="outlined">
                        <Statistic
                            title="Ort. Yanıt Süresi"
                            value={stats.avgResponseTime}
                            prefix={<ClockCircleOutlined />}
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
