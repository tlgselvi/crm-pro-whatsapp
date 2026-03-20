'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    Card, Row, Col, Statistic, List, Typography, Badge,
    Progress, Avatar, Tag, Space, Button, Spin, Empty, Checkbox, Tooltip
} from 'antd';
import {
    MessageOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FireOutlined,
    ThunderboltOutlined,
    ArrowRightOutlined,
    WarningOutlined,
    TrophyOutlined,
    TeamOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
    totalContacts: number;
    activeConversations: number;
    totalMessages: number;
    wonDeals: number;
    lostDeals: number;
    todayLeads: number;
    weekLeads: number;
    hotLeads: number;
    conversionRate: number;
    pendingTasks: number;
}

interface PipelineStage {
    stage: string;
    count: number;
}

interface RecentConv {
    id: string;
    contact_name: string;
    last_message_at: string;
    unread_count: number;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    is_completed: boolean;
    contact_id?: string;
    contact_name?: string;
}

const STAGE_LABELS: Record<string, string> = {
    new: 'Yeni',
    contacted: 'İletişim',
    qualified: 'Nitelikli',
    proposal: 'Teklif',
    negotiation: 'Pazarlık',
    won: 'Kazanıldı',
    lost: 'Kaybedildi',
};

const STAGE_COLORS: Record<string, string> = {
    new: '#1890ff',
    contacted: '#52c41a',
    qualified: '#faad14',
    proposal: '#722ed1',
    negotiation: '#eb2f96',
    won: '#00b96b',
    lost: '#ff4d4f',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalContacts: 0,
        activeConversations: 0,
        totalMessages: 0,
        wonDeals: 0,
        lostDeals: 0,
        todayLeads: 0,
        weekLeads: 0,
        hotLeads: 0,
        conversionRate: 0,
        pendingTasks: 0,
    });
    const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
    const [recentConvs, setRecentConvs] = useState<RecentConv[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const todayStart = dayjs().startOf('day').toISOString();
            const weekStart = dayjs().subtract(7, 'day').toISOString();

            const [
                { count: totalContacts },
                { count: activeConversations },
                { count: totalMessages },
                { count: wonDeals },
                { count: lostDeals },
                { count: todayLeads },
                { count: weekLeads },
                { count: hotLeads },
                { data: pipelineRaw },
                { data: convRaw },
            ] = await Promise.all([
                supabase.from('contacts').select('*', { count: 'exact', head: true }),
                supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('messages').select('*', { count: 'exact', head: true }),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('stage', 'won'),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('stage', 'lost'),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('lead_temperature', 'HOT'),
                supabase.from('contacts').select('stage').neq('stage', null),
                supabase.from('conversations')
                    .select('id, last_message_at, unread_count, contacts(name)')
                    .order('last_message_at', { ascending: false })
                    .limit(5),
            ]);

            // Pipeline aggregation
            const stageMap: Record<string, number> = {};
            (pipelineRaw ?? []).forEach((c: any) => {
                if (c.stage) stageMap[c.stage] = (stageMap[c.stage] ?? 0) + 1;
            });
            const pipelineData = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

            // Recent conversations
            const recentData: RecentConv[] = (convRaw ?? []).map((c: any) => ({
                id: c.id,
                contact_name: c.contacts?.name ?? 'Bilinmeyen',
                last_message_at: c.last_message_at,
                unread_count: c.unread_count ?? 0,
            }));

            // Pending tasks count
            const { count: pendingTasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('is_completed', false);

            const total = totalContacts ?? 0;
            const won = wonDeals ?? 0;
            const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

            setStats({
                totalContacts: total,
                activeConversations: activeConversations ?? 0,
                totalMessages: totalMessages ?? 0,
                wonDeals: won,
                lostDeals: lostDeals ?? 0,
                todayLeads: todayLeads ?? 0,
                weekLeads: weekLeads ?? 0,
                hotLeads: hotLeads ?? 0,
                conversionRate: convRate,
                pendingTasks: pendingTasks ?? 0,
            });
            setPipeline(pipelineData);
            setRecentConvs(recentData);
        } catch (err) {
            console.error('Dashboard veri hatası:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        setTasksLoading(true);
        try {
            const { data } = await supabase
                .from('tasks')
                .select('*, contacts(name)')
                .eq('is_completed', false)
                .order('due_date', { ascending: true })
                .limit(10);

            const mapped: Task[] = (data ?? []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                due_date: t.due_date,
                is_completed: t.is_completed,
                contact_id: t.contact_id,
                contact_name: t.contacts?.name,
            }));
            setTasks(mapped);
        } catch (err) {
            console.error('Görevler hatası:', err);
        } finally {
            setTasksLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchAll();
        fetchTasks();
    }, [fetchAll, fetchTasks]);

    async function completeTask(taskId: string) {
        try {
            await supabase
                .from('tasks')
                .update({ is_completed: true, updated_at: new Date().toISOString() })
                .eq('id', taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setStats(prev => ({ ...prev, pendingTasks: Math.max(0, prev.pendingTasks - 1) }));
        } catch (err) {
            console.error('Görev tamamlama hatası:', err);
        }
    }

    if (!mounted) return null;

    const totalPipelineContacts = pipeline.reduce((acc, p) => acc + p.count, 0);
    const conversionRate = stats.conversionRate;
    const lossRate = totalPipelineContacts > 0
        ? Math.round((stats.lostDeals / totalPipelineContacts) * 100)
        : 0;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 0' }}>
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Elite Satış Paneli</Title>
                    <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
                        Satış hattı ve performans özeti — {dayjs().format('D MMMM YYYY')}
                    </Text>
                </div>
                <Tag color="gold" icon={<ThunderboltOutlined />} style={{ padding: '4px 12px', borderRadius: 20 }}>
                    Canlı Veri
                </Tag>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 80 }}>
                    <Spin size="large" />
                    <div style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Veriler yükleniyor…</div>
                </div>
            ) : (
                <>
                    {/* ── KPI Stats ─────────────────────────────────────────── */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={8} lg={4}>
                            <Card variant="borderless" style={{ background: 'var(--container-bg)', textAlign: 'center' }}>
                                <Statistic
                                    title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Toplam Lead</Text>}
                                    value={stats.totalContacts}
                                    prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                                    valueStyle={{ color: 'var(--text-main)', fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} lg={4}>
                            <Card variant="borderless" style={{ background: 'var(--container-bg)', textAlign: 'center' }}>
                                <Statistic
                                    title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Bu Hafta Yeni</Text>}
                                    value={stats.weekLeads}
                                    prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                                    valueStyle={{ color: 'var(--text-main)', fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} lg={4}>
                            <Card variant="borderless" style={{ background: 'var(--container-bg)', textAlign: 'center' }}>
                                <Statistic
                                    title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Sıcak Lead</Text>}
                                    value={stats.hotLeads}
                                    prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
                                    valueStyle={{ color: stats.hotLeads > 0 ? '#ff4d4f' : 'var(--text-main)', fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} lg={4}>
                            <Card variant="borderless" style={{ background: 'var(--container-bg)', textAlign: 'center' }}>
                                <Statistic
                                    title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Kazanılan</Text>}
                                    value={stats.wonDeals}
                                    prefix={<TrophyOutlined style={{ color: '#00b96b' }} />}
                                    valueStyle={{ color: '#00b96b', fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} lg={4}>
                            <Card variant="borderless" style={{ background: 'var(--container-bg)', textAlign: 'center' }}>
                                <Statistic
                                    title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Dönüşüm Oranı</Text>}
                                    value={stats.conversionRate}
                                    suffix="%"
                                    prefix={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
                                    valueStyle={{ color: stats.conversionRate >= 20 ? '#00b96b' : 'var(--text-main)', fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} lg={4}>
                            <Card variant="borderless" style={{ background: 'var(--container-bg)', textAlign: 'center' }}>
                                <Statistic
                                    title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Bekleyen Görev</Text>}
                                    value={stats.pendingTasks}
                                    prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
                                    valueStyle={{ color: stats.pendingTasks > 0 ? '#ff4d4f' : 'var(--text-main)', fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {/* ── Pipeline Visualization ────────────────────────────── */}
                    <Card variant="borderless" style={{ marginBottom: 24, background: 'var(--container-bg)', overflow: 'hidden' }}>
                        <div style={{ marginBottom: 16 }}>
                            <Title level={4} style={{ margin: 0, color: 'var(--text-main)' }}>Satış Boru Hattı</Title>
                        </div>
                        {pipeline.length === 0 ? (
                            <Empty description={<Text style={{ color: 'var(--text-secondary)' }}>Henüz lead yok</Text>} />
                        ) : (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '20px 40px',
                                position: 'relative',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}>
                                {pipeline.map((p, i) => (
                                    <React.Fragment key={p.stage}>
                                        <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                                            <div style={{
                                                fontSize: 28,
                                                fontWeight: 700,
                                                color: STAGE_COLORS[p.stage] ?? 'var(--primary)',
                                            }}>
                                                {p.count}
                                            </div>
                                            <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                                {STAGE_LABELS[p.stage] ?? p.stage}
                                            </Text>
                                        </div>
                                        {i < pipeline.length - 1 && (
                                            <ArrowRightOutlined style={{ color: 'var(--text-secondary)', fontSize: 16, opacity: 0.4 }} />
                                        )}
                                    </React.Fragment>
                                ))}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0, left: 0,
                                    width: '100%', height: 3,
                                    background: 'linear-gradient(90deg, #1890ff, #722ed1, #00b96b)',
                                }} />
                            </div>
                        )}
                    </Card>

                    <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                        {/* ── Recent Conversations ───────────────────────────── */}
                        <Col xs={24} lg={14}>
                            <Card
                                variant="borderless"
                                title={
                                    <Space>
                                        <MessageOutlined style={{ color: '#1890ff' }} />
                                        <span style={{ color: 'var(--text-main)' }}>Son Konuşmalar</span>
                                    </Space>
                                }
                                style={{ background: 'var(--container-bg)', height: '100%' }}
                            >
                                {recentConvs.length === 0 ? (
                                    <Empty description={<Text style={{ color: 'var(--text-secondary)' }}>Henüz konuşma yok</Text>} />
                                ) : (
                                    <List
                                        dataSource={recentConvs}
                                        renderItem={(item) => (
                                            <List.Item
                                                style={{
                                                    padding: '12px 0',
                                                    borderBottom: '1px solid var(--border-color)',
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={
                                                        <Avatar
                                                            icon={<UserOutlined />}
                                                            style={{ background: '#28292a', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                                        />
                                                    }
                                                    title={
                                                        <Space>
                                                            <Text strong style={{ color: 'var(--text-main)' }}>{item.contact_name}</Text>
                                                            {item.unread_count > 0 && (
                                                                <Badge count={item.unread_count} size="small" />
                                                            )}
                                                        </Space>
                                                    }
                                                    description={
                                                        <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                            {dayjs(item.last_message_at).fromNow()}
                                                        </Text>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </Col>

                        {/* ── Sistem Performansı ────────────────────────────── */}
                        <Col xs={24} lg={10}>
                            <Card
                                variant="borderless"
                                title={<span style={{ color: 'var(--text-main)' }}>Performans Özeti</span>}
                                style={{ background: 'var(--container-bg)' }}
                            >
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: 'var(--text-secondary)' }}>Dönüşüm Oranı</Text>
                                        <Text strong style={{ color: 'var(--text-main)' }}>{conversionRate}%</Text>
                                    </div>
                                    <Progress
                                        percent={conversionRate}
                                        strokeColor="#00b96b"
                                        trailColor="rgba(255,255,255,0.06)"
                                        showInfo={false}
                                    />
                                </div>
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: 'var(--text-secondary)' }}>Kayıp Oranı</Text>
                                        <Text strong style={{ color: 'var(--text-main)' }}>{lossRate}%</Text>
                                    </div>
                                    <Progress
                                        percent={lossRate}
                                        strokeColor="#ff4d4f"
                                        trailColor="rgba(255,255,255,0.06)"
                                        showInfo={false}
                                    />
                                </div>
                                <Row gutter={[16, 16]}>
                                    <Col span={12}>
                                        <Statistic
                                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Kazanılan</Text>}
                                            value={stats.wonDeals}
                                            valueStyle={{ fontSize: 20, color: '#00b96b' }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Kaybedilen</Text>}
                                            value={stats.lostDeals}
                                            valueStyle={{ fontSize: 20, color: '#ff4d4f' }}
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>

                    {/* ── Görevler ──────────────────────────────────────────── */}
                    <Card
                        variant="borderless"
                        style={{ background: 'var(--container-bg)' }}
                        title={
                            <Space>
                                <CheckCircleOutlined style={{ color: '#faad14' }} />
                                <span style={{ color: 'var(--text-main)' }}>
                                    Bekleyen Görevler
                                </span>
                                {stats.pendingTasks > 0 && (
                                    <Badge count={stats.pendingTasks} style={{ backgroundColor: '#ff4d4f' }} />
                                )}
                            </Space>
                        }
                    >
                        {tasksLoading ? (
                            <div style={{ textAlign: 'center', padding: 32 }}>
                                <Spin size="small" />
                            </div>
                        ) : tasks.length === 0 ? (
                            <Empty
                                description={<Text style={{ color: 'var(--text-secondary)' }}>Tüm görevler tamamlandı 🎉</Text>}
                            />
                        ) : (
                            <List
                                dataSource={tasks}
                                renderItem={(task) => {
                                    const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs());
                                    return (
                                        <List.Item
                                            style={{
                                                padding: '12px 0',
                                                borderBottom: '1px solid var(--border-color)',
                                            }}
                                            actions={[
                                                <Tooltip title="Tamamlandı olarak işaretle" key="complete">
                                                    <Button
                                                        type="text"
                                                        icon={<CheckCircleOutlined />}
                                                        onClick={() => completeTask(task.id)}
                                                        style={{ color: '#52c41a' }}
                                                        size="small"
                                                    >
                                                        Tamamla
                                                    </Button>
                                                </Tooltip>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <Space>
                                                        <Text style={{ color: 'var(--text-main)' }}>{task.title}</Text>
                                                        {isOverdue && (
                                                            <Tag color="red" icon={<WarningOutlined />}>Gecikmiş</Tag>
                                                        )}
                                                        {task.contact_name && (
                                                            <Tag color="blue" icon={<UserOutlined />} style={{ fontSize: 11 }}>
                                                                {task.contact_name}
                                                            </Tag>
                                                        )}
                                                    </Space>
                                                }
                                                description={
                                                    <Space direction="vertical" size={0}>
                                                        {task.description && (
                                                            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                                {task.description}
                                                            </Text>
                                                        )}
                                                        {task.due_date && (
                                                            <Text style={{
                                                                fontSize: 11,
                                                                color: isOverdue ? '#ff4d4f' : 'var(--text-secondary)',
                                                            }}>
                                                                <CalendarOutlined style={{ marginRight: 4 }} />
                                                                {dayjs(task.due_date).format('D MMMM YYYY, HH:mm')}
                                                            </Text>
                                                        )}
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
