'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Table, Tag, Input, Button, Space, Modal, Form, Select, App, Statistic, Row, Col } from 'antd';
import { SendOutlined, FilterOutlined, UserOutlined, MessageOutlined, RocketOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function BroadcastPage() {
    const { message: msg } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        champions: 0,
        leads: 0
    });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('lead_score', { ascending: false });

        if (!error && data) {
            setContacts(data);
            setStats({
                total: data.length,
                champions: data.filter(c => c.lifecycle_stage === 'champion').length,
                leads: data.filter(c => c.lifecycle_stage === 'lead').length
            });
        }
        setLoading(false);
    };

    const handleBroadcast = async (values: any) => {
        if (selectedRows.length === 0) {
            msg.warning('Lütfen mesaj gönderilecek kişileri seçin.');
            return;
        }

        setSending(true);
        try {
            // 1. Create Broadcast record
            const { data: broadcast } = await supabase.from('broadcasts').insert({
                name: values.name,
                content: values.content,
                status: 'sending',
                total_count: selectedRows.length,
                filter_config: { manual_selection: true }
            }).select().single();

            // 2. Gercek WhatsApp gonderimi - Phase 6
            const contactIds = selectedRows.map((c: any) => c.id);
            const response = await fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactIds,
                    message: values.content,
                    campaignName: values.name,
                }),
            });

            const result = await response.json();
            const successCount = result.sent || 0;
            const failCount = result.failed || 0;

            // 3. Update status
            if (broadcast?.id) {
                await supabase.from('broadcasts').update({
                    status: failCount === 0 ? 'completed' : 'partial',
                    sent_count: successCount
                }).eq('id', broadcast.id);
            }

            if (failCount === 0) {
                msg.success(`✅ ${successCount} kişiye WhatsApp mesajı gönderildi!`);
            } else {
                msg.warning(`📊 ${successCount} başarılı, ${failCount} başarısız. ${result.errors?.[0] || ''}`);
            }

            setIsModalOpen(false);
            form.resetFields();
            setSelectedRows([]);
        } catch (error) {
            console.error('Broadcast error:', error);
            msg.error('Duyuru sırasında bir hata oluştu.');
        } finally {
            setSending(false);
        }
    };

    const columns = [
        {
            title: 'Müşteri',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <Space>
                    <UserOutlined />
                    <div>
                        <Text strong>{text || 'İsimsiz'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Durum',
            dataIndex: 'lifecycle_stage',
            key: 'lifecycle_stage',
            render: (stage: string) => {
                const colors: any = { champion: 'gold', qualified: 'blue', lead: 'default' };
                return <Tag color={colors[stage] || 'default'}>{(stage || 'lead').toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Lead Score',
            dataIndex: 'lead_score',
            key: 'lead_score',
            sorter: (a: any, b: any) => a.lead_score - b.lead_score,
            render: (score: number) => (
                <Text style={{ color: score > 70 ? '#52c41a' : score > 30 ? '#1890ff' : '#8c8c8c', fontWeight: 'bold' }}>
                    {score || 0}
                </Text>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Elite Duyuru Merkezi</Title>
                    <Text style={{ color: 'var(--text-secondary)' }}>Müşteri segmentlerine toplu WhatsApp duyuruları gönderin.</Text>
                </div>
                <Button
                    type="primary"
                    icon={<RocketOutlined />}
                    size="large"
                    onClick={() => setIsModalOpen(true)}
                    disabled={selectedRows.length === 0}
                >
                    Duyuru Başlat ({selectedRows.length})
                </Button>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col span={8}>
                    <Card variant="borderless">
                        <Statistic title="Toplam Segment" value={stats.total} prefix={<UserOutlined />} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card variant="borderless">
                        <Statistic title="Champions (Sıcak)" value={stats.champions} valueStyle={{ color: '#faad14' }} prefix={<RocketOutlined />} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card variant="borderless">
                        <Statistic title="Leads (Soğuk)" value={stats.leads} prefix={<MessageOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Card variant="borderless" title="Alıcı Seçimi">
                <Table
                    loading={loading}
                    dataSource={contacts}
                    columns={columns}
                    rowKey="id"
                    rowSelection={{
                        onChange: (_, selected) => setSelectedRows(selected)
                    }}
                />
            </Card>

            <Modal
                title="Yeni Duyuru Oluştur"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={sending}
                okText="Duyuruyu Gönder"
                cancelText="İptal"
            >
                <Paragraph type="secondary">
                    <b>Seçili Alıcı:</b> {selectedRows.length} Kişi
                </Paragraph>
                <Form form={form} layout="vertical" onFinish={handleBroadcast}>
                    <Form.Item name="name" label="Duyuru Başlığı" rules={[{ required: true }]}>
                        <Input placeholder="Örn: Hafta Sonu Kampanyası" />
                    </Form.Item>
                    <Form.Item name="content" label="Mesaj İçeriği" rules={[{ required: true }]}>
                        <TextArea rows={6} placeholder="Merhaba {{adı}}, size özel bir teklifimiz var..." />
                    </Form.Item>
                    <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                        <Text style={{ fontSize: 12, color: '#0369a1' }}>
                            💡 İpucu: Mesaj içeriğinde müşterinin adını kullanmak için yazılımsal değişkenleri buraya eklemeye devam edeceğiz.
                        </Text>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
