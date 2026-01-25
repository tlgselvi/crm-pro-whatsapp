'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Table, Tag, Space, Typography, App, Modal, Statistic, Row, Col, Alert } from 'antd';
import { SendOutlined, TeamOutlined, HistoryOutlined, SoundOutlined } from '@ant-design/icons';
import { supabase, type Contact, type Broadcast } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const STAGES = [
    { id: 'new', name: 'Incoming', color: '#1890ff' },
    { id: 'contacted', name: 'Contacted', color: '#52c41a' },
    { id: 'qualified', name: 'Qualified', color: '#faad14' },
    { id: 'proposal', name: 'Proposal', color: '#722ed1' },
    { id: 'negotiation', name: 'Negotiation', color: '#eb2f96' },
    { id: 'won', name: 'Won', color: '#52c41a' },
    { id: 'lost', name: 'Lost', color: '#ff4d4f' },
];

export default function BroadcastingPage() {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [targetCount, setTargetCount] = useState(0);

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    async function fetchBroadcasts() {
        try {
            const { data, error } = await supabase
                .from('broadcasts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBroadcasts(data || []);
        } catch (error) {
            console.error('Error fetching broadcasts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleStageChange(stage: string) {
        if (!stage) {
            setTargetCount(0);
            return;
        }

        const { count, error } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('stage', stage);

        if (error) {
            console.error('Error counting contacts:', error);
            return;
        }

        setTargetCount(count || 0);
    }

    async function onFinish(values: any) {
        if (targetCount === 0) {
            message.error('Hedef kitlede kimse bulunamadı!');
            return;
        }

        setSending(true);
        try {
            // 1. Get all target contacts
            const { data: contacts, error: contactError } = await supabase
                .from('contacts')
                .select('id')
                .eq('stage', values.stage);

            if (contactError) throw contactError;

            // 2. Create broadcast record
            const { data: broadcast, error: broadcastError } = await supabase
                .from('broadcasts')
                .insert({
                    name: values.name,
                    content: values.content,
                    target_stage: values.stage,
                    status: 'completed'
                })
                .select()
                .single();

            if (broadcastError) throw broadcastError;

            // 3. Create messages for each contact (Local simulation of mass sending)
            // In a real app, this would trigger a background job to send via WhatsApp API
            for (const contact of contacts) {
                // Find or create conversation
                let convId;
                const { data: existingConv } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('contact_id', contact.id)
                    .single();

                if (existingConv) {
                    convId = existingConv.id;
                } else {
                    const { data: newConv } = await supabase
                        .from('conversations')
                        .insert({ contact_id: contact.id, status: 'active' })
                        .select()
                        .single();
                    convId = newConv?.id;
                }

                if (convId) {
                    await supabase.from('messages').insert({
                        conversation_id: convId,
                        sender: 'agent',
                        content: values.content,
                        is_read: true,
                        platform: 'internal'
                    });
                }
            }

            message.success(`${targetCount} kişiye toplu mesaj başarıyla gönderildi!`);
            form.resetFields();
            setTargetCount(0);
            fetchBroadcasts();
        } catch (error) {
            console.error('Broadcast error:', error);
            message.error('Toplu mesaj gönderilirken bir hata oluştu.');
        } finally {
            setSending(false);
        }
    }

    const columns = [
        {
            title: 'Kampanya Adı',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Mesaj',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
        },
        {
            title: 'Hedef Aşama',
            dataIndex: 'target_stage',
            key: 'target_stage',
            render: (stage: string) => {
                const stageInfo = STAGES.find(s => s.id === stage);
                return <Tag color={stageInfo?.color}>{stageInfo?.name || stage}</Tag>;
            },
        },
        {
            title: 'Tarih',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('DD MMM YYYY, HH:mm'),
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color="green">{status.toUpperCase()}</Tag>,
        },
    ];

    return (
        <div style={{ padding: '0 24px' }}>
            <Title level={2} style={{ marginBottom: 24 }}>
                <SoundOutlined /> Broadcasting (Mass Messaging)
            </Title>

            <Row gutter={24}>
                <Col span={10}>
                    <Card title="Yeni Toplu Mesaj Oluştur" variant="borderless">
                        <Form form={form} layout="vertical" onFinish={onFinish}>
                            <Form.Item
                                label="Kampanya Adı"
                                name="name"
                                rules={[{ required: true, message: 'Lütfen bir kampanya adı girin' }]}
                            >
                                <Input placeholder="Örn: Hafta Sonu İndirimi" />
                            </Form.Item>

                            <Form.Item
                                label="Hedef Pipeline Aşaması"
                                name="stage"
                                rules={[{ required: true, message: 'Lütfen bir hedef aşama seçin' }]}
                            >
                                <Select
                                    placeholder="Seçiniz..."
                                    onChange={handleStageChange}
                                    options={STAGES.map(s => ({ label: s.name, value: s.id }))}
                                />
                            </Form.Item>

                            {targetCount > 0 && (
                                <Alert
                                    message={`${targetCount} kişi hedeflendi.`}
                                    type="info"
                                    showIcon
                                    icon={<TeamOutlined />}
                                    style={{ marginBottom: 24 }}
                                />
                            )}

                            <Form.Item
                                label="Mesaj İçeriği"
                                name="content"
                                rules={[{ required: true, message: 'Lütfen mesaj içeriği girin' }]}
                            >
                                <TextArea
                                    rows={6}
                                    placeholder="Müşterilerinize ne söylemek istersiniz?"
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<SendOutlined />}
                                    loading={sending}
                                    block
                                    size="large"
                                >
                                    Toplu Mesaj Gönder
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col span={14}>
                    <Card title={<Space><HistoryOutlined /> Kampanya Geçmişi</Space>} variant="borderless">
                        <Table
                            dataSource={broadcasts}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 5 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="💡 Bilgi" variant="borderless" style={{ marginTop: 24 }}>
                <Paragraph>
                    Broadcasting özelliği, belirli bir pipeline aşamasındaki tüm kontaklarınıza aynı anda mesaj göndermenizi sağlar.
                </Paragraph>
                <Space direction="vertical">
                    <Text type="secondary">• Mesajlar her kontağın kendi sohbet geçmişine eklenir.</Text>
                    <Text type="secondary">• WhatsApp API üzerinden gerçek gönderim için API kredisi gereklidir.</Text>
                    <Text type="secondary">• Kampanya geçmişinden gönderilen toplu mesajları ve durumlarını takip edebilirsiniz.</Text>
                </Space>
            </Card>
        </div>
    );
}
