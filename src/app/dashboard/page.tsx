'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Typography, Badge, Progress, Avatar, Tag, Space, Button } from 'antd';
import {
    MessageOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FireOutlined,
    ThunderboltOutlined,
    ArrowRightOutlined,
    WarningOutlined
} from '@ant-design/icons';
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
    const [pipeline, setPipeline] = useState<any[]>([]);
    const [urgentTickets, setUrgentTickets] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        fetchStats();
        fetchPipeline();
        fetchUrgentTickets();
    }, []);

    if (!mounted) return null;

    async function fetchStats() {
        try {
            const { count: contactCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
            const { count: convCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active');
            const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

            setStats({
                totalContacts: contactCount || 0,
                activeConversations: convCount || 0,
                totalMessages: msgCount || 0,
                avgResponseTime: '12dk', // Mock or calculate
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    async function fetchPipeline() {
        // Stages: lead, qualified, champion
        const stages = ['lead', 'qualified', 'customer', 'champion'];
        const pipelineData = await Promise.all(stages.map(async (stage) => {
            const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('lifecycle_stage', stage);
            return { stage, count: count || 0 };
        }));
        setPipeline(pipelineData);
    }

    async function fetchUrgentTickets() {
        const { data } = await supabase
            .from('tickets')
            .select('*, contacts(*)')
            .eq('status', 'open')
            .order('priority', { ascending: false }) // Urgent, High, etc.
            .limit(5);
        setUrgentTickets(data || []);
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 0' }}>
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Elite Satış Paneli</Title>
                    <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Satış hattı ve acil durum takibi.</Text>
                </div>
                <Tag color="gold" icon={<ThunderboltOutlined />} style={{ padding: '4px 12px', borderRadius: 20 }}>
                    Infinity Engine: Aktif
                </Tag>
            </div>

            {/* PIPELINE VISUALIZATION */}
            <Card variant="borderless" style={{ marginBottom: 24, background: 'var(--container-bg)', overflow: 'hidden' }}>
                <div style={{ marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0, color: 'var(--text-main)' }}>Satış Boru Hattı (Sales Pipeline)</Title>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 40px',
                    position: 'relative'
                }}>
                    {pipeline.map((p, i) => (
                        <React.Fragment key={p.stage}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>{p.count}</div>
                                <Text strong style={{ textTransform: 'capitalize' }}>{p.stage}</Text>
                            </div>
                            {i < pipeline.length - 1 && (
                                <ArrowRightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 20 }} />
                            )}
                        </React.Fragment>
                    ))}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: 4,
                        background: 'linear-gradient(90deg, #2563eb, #7c3aed, #ec4899)'
                    }} />
                </div>
            </Card>

            <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
                <Col xs={24} lg={16}>
                    <Card
                        title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} /> Acil Müdahale Bekleyenler</Space>}
                        variant="borderless"
                    >
                        <List
                            dataSource={urgentTickets}
                            renderItem={(item: any) => (
                                <List.Item
                                    style={{
                                        padding: '16px',
                                        borderRadius: 12,
                                        marginBottom: 12,
                                        background: item.priority === 'urgent' ? 'rgba(255, 77, 79, 0.05)' : 'transparent',
                                        border: item.priority === 'urgent' ? '1px solid rgba(255, 77, 79, 0.1)' : '1px solid var(--border-color)'
                                    }}
                                    actions={[<Button type="link">Dosyaya Git</Button>]}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ background: item.priority === 'urgent' ? '#ff4d4f' : '#faad14' }} icon={<FireOutlined />} />}
                                        title={
                                            <Space>
                                                <Text strong>{item.title}</Text>
                                                <Tag color={item.priority === 'urgent' ? 'red' : 'orange'}>{item.priority?.toUpperCase()}</Tag>
                                            </Space>
                                        }
                                        description={
                                            <Space direction="vertical" size={0}>
                                                <Text>{item.contacts?.name} - Score: {item.contacts?.lead_score}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.created_at).fromNow()}</Text>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Sistem Performansı" variant="borderless">
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Kayıp Oranı</Text>
                                <Text strong>2%</Text>
                            </div>
                            <Progress percent={98} strokeColor="#52c41a" showInfo={false} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Otomasyon Başarısı</Text>
                                <Text strong>84%</Text>
                            </div>
                            <Progress percent={84} strokeColor="var(--primary)" showInfo={false} />
                        </div>

                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Statistic title="Top. Mesaj" value={stats.totalMessages} valueStyle={{ fontSize: 20 }} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Yanıt Hızı" value={stats.avgResponseTime} valueStyle={{ fontSize: 20 }} />
                            </Col>
                        </Row>
                    </Card>

                    <Card variant="borderless" style={{ marginTop: 24, background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
                        <Title level={4} style={{ color: 'white', margin: 0 }}>Günün Hedefi</Title>
                        <div style={{ marginTop: 12 }}>
                            <Progress type="circle" percent={75} strokeColor="#fbbf24" style={{ display: 'block', margin: '0 auto' }} />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Text style={{ color: '#c7d2fe' }}>12/16 Satış Tamamlandı</Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
