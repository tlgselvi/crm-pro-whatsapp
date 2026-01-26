'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, Typography, Row, Col, Spin, Empty, Tag, App } from 'antd';
import { PlusOutlined, RobotOutlined, NodeIndexOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Workflow {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    trigger_type: string;
    updated_at: string;
}

export default function AutomationsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { message, modal } = App.useApp();

    useEffect(() => {
        fetchWorkflows();
    }, []);

    async function fetchWorkflows() {
        setLoading(true);
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            message.error('Akışlar yüklenemedi');
        } else {
            setWorkflows(data || []);
        }
        setLoading(false);
    }

    async function createWorkflow() {
        const { data, error } = await supabase
            .from('workflows')
            .insert([{
                name: 'Yeni Otomasyon',
                description: 'Henüz açıklama yok',
                trigger_type: 'keyword',
                is_active: false
            }])
            .select()
            .single();

        if (error) {
            message.error('Oluşturulamadı');
        } else if (data) {
            message.success('Otomasyon oluşturuldu');
            router.push(`/dashboard/automations/${data.id}`);
        }
    }

    const deleteWorkflow = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        modal.confirm({
            title: 'Emin misiniz?',
            content: 'Bu otomasyonu silmek geri alınamaz.',
            okText: 'Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk: async () => {
                const { error } = await supabase.from('workflows').delete().eq('id', id);
                if (error) message.error('Silinemedi');
                else {
                    message.success('Silindi');
                    fetchWorkflows();
                }
            }
        });
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Otomasyonlar</Title>
                    <Text style={{ color: 'var(--text-secondary)' }}>WhatsApp botlarınızı ve iş akışlarınızı yönetin</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={createWorkflow}
                    style={{ borderRadius: 8, height: 45 }}
                >
                    Yeni Oluştur
                </Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
            ) : workflows.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<Text style={{ color: 'var(--text-secondary)' }}>Henüz hiç otomasyon yok</Text>}
                >
                    <Button type="primary" onClick={createWorkflow}>İlkini Oluştur</Button>
                </Empty>
            ) : (
                <Row gutter={[24, 24]}>
                    {workflows.map(flow => (
                        <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
                            <Card
                                hoverable
                                onClick={() => router.push(`/dashboard/automations/${flow.id}`)}
                                style={{
                                    borderRadius: 16,
                                    background: 'var(--container-bg)',
                                    border: 'var(--glass-border)',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                actions={[
                                    <EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/automations/${flow.id}`); }} />,
                                    <DeleteOutlined key="delete" onClick={(e) => deleteWorkflow(e, flow.id)} />
                                ]}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: 'var(--input-bg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--primary)'
                                    }}>
                                        <NodeIndexOutlined style={{ fontSize: 24 }} />
                                    </div>
                                    <Tag color={flow.is_active ? 'success' : 'default'}>
                                        {flow.is_active ? 'Aktif' : 'Taslak'}
                                    </Tag>
                                </div>
                                <Title level={4} style={{ marginBottom: 8, color: 'var(--text-main)' }}>{flow.name}</Title>
                                <Text style={{ color: 'var(--text-secondary)', marginBottom: 16, display: 'block', flex: 1 }}>
                                    {flow.description || 'Açıklama yok'}
                                </Text>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <Tag icon={<RobotOutlined />}>{flow.trigger_type}</Tag>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}
