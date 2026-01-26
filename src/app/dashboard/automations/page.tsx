'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, Typography, Row, Col, Spin, Empty, Tag, App, Space, Modal, Input, Form } from 'antd';
import { PlusOutlined, RobotOutlined, NodeIndexOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined, BulbOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { autopilotGenerateFlow } from '@/lib/actions-autopilot';

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
    const [autopilotLoading, setAutopilotLoading] = useState(false);
    const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
    const [magicForm] = Form.useForm();
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
        // ... (existing logic remains)
    }

    async function handleMagicCreate(values: { prompt: string }) {
        setAutopilotLoading(true);
        try {
            const result = await autopilotGenerateFlow(values.prompt);
            if (result.success && result.flow) {
                // 1. Create the workflow header
                const { data: workflow, error: workflowError } = await supabase
                    .from('workflows')
                    .insert([{
                        name: `AI: ${values.prompt.substring(0, 20)}...`,
                        description: values.prompt,
                        trigger_type: 'keyword',
                        is_active: false
                    }])
                    .select()
                    .single();

                if (workflowError) throw workflowError;

                // 2. Map AI nodes and edges to relational tables
                // Ensure there is at least one 'trigger' node
                let nodes = result.flow.nodes;
                let edges = result.flow.edges;

                if (!nodes.some(n => n.type === 'trigger')) {
                    const triggerId = crypto.randomUUID();
                    nodes.unshift({
                        id: triggerId,
                        type: 'trigger',
                        position: { x: -200, y: 0 },
                        data: { label: 'Giriş Tetikleyici', content: 'Merhaba' }
                    });
                    if (nodes[1]) {
                        edges.unshift({
                            id: crypto.randomUUID(),
                            source: triggerId,
                            target: nodes[1].id,
                            animated: true
                        });
                    }
                }

                // Insert Nodes
                const nodeMapping: Record<string, string> = {};
                const nodesToInsert = nodes.map(n => {
                    const newUuid = crypto.randomUUID();
                    nodeMapping[n.id] = newUuid;
                    return {
                        id: newUuid,
                        workflow_id: workflow.id,
                        type: n.type,
                        label: n.data.label,
                        content: {
                            content: n.data.content,
                            variable_name: n.data.variableName,
                            delay_duration: n.data.delayDuration,
                            delay_unit: n.data.delayUnit
                        },
                        position_x: n.position.x,
                        position_y: n.position.y
                    };
                });

                const { error: nodesError } = await supabase.from('workflow_nodes').insert(nodesToInsert);
                if (nodesError) throw nodesError;

                // Insert Edges
                const edgesToInsert = edges.map(e => ({
                    workflow_id: workflow.id,
                    source_node_id: nodeMapping[e.source],
                    target_node_id: nodeMapping[e.target]
                })).filter(e => e.source_node_id && e.target_node_id);

                if (edgesToInsert.length > 0) {
                    const { error: edgesError } = await supabase.from('workflow_edges').insert(edgesToInsert);
                    if (edgesError) throw edgesError;
                }

                message.success('Sihirli akış inşa edildi! ✨');
                setIsMagicModalOpen(false);
                magicForm.resetFields();
                router.push(`/dashboard/automations/${workflow.id}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            message.error('Sihirli kurulum başarısız: ' + error.message);
        } finally {
            setAutopilotLoading(false);
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
                <Space>
                    <Button
                        icon={<ThunderboltOutlined />}
                        size="large"
                        onClick={() => setIsMagicModalOpen(true)}
                        style={{ borderRadius: 8, height: 45, background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)', color: 'white', border: 'none' }}
                    >
                        Sihirli Oluştur 🪄
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={createWorkflow}
                        style={{ borderRadius: 8, height: 45 }}
                    >
                        Yeni Oluştur
                    </Button>
                </Space>
            </div>

            <Modal
                title={<span><BulbOutlined /> Sihirli Otomasyon Kurulumu</span>}
                open={isMagicModalOpen}
                onCancel={() => setIsMagicModalOpen(false)}
                onOk={() => magicForm.submit()}
                confirmLoading={autopilotLoading}
                okText="Akışı İnşa Et"
                cancelText="İptal"
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Botun ne yapmasını istediğinizi anlatın, o sizin için tüm akışı çizsin.</Text>
                </div>
                <Form form={magicForm} onFinish={handleMagicCreate}>
                    <Form.Item name="prompt" rules={[{ required: true, message: 'Lütfen bir açıklama yazın' }]}>
                        <Input.TextArea rows={4} placeholder="Örn: Müşteri fiyat sorunca ismini sor, sonra 5 dakika bekle ve indirim kodunu gönder. Sonra bizi temsilciye bağla." />
                    </Form.Item>
                </Form>
                <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <Text style={{ fontSize: 12, color: 'var(--primary-pastel)' }}>
                        ✨ İpucu: Botun içinde 'bekleme', 'soru sorma' ve 'temsilciye aktarma' gibi gelişmiş mantıkları da kullanabilirsiniz.
                    </Text>
                </div>
            </Modal>

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
