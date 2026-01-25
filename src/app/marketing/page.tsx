'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Typography, Modal, Form, Input, Select, Progress, App, Statistic, Row, Col } from 'antd';
import { SendOutlined, PlusOutlined, HistoryOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function MarketingPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { message } = App.useApp();
    const [form] = Form.useForm();

    useEffect(() => {
        fetchCampaigns();
        fetchContacts();
    }, []);

    async function fetchCampaigns() {
        setLoading(true);
        const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
        if (!error) setCampaigns(data || []);
        setLoading(false);
    }

    async function fetchContacts() {
        const { data } = await supabase.from('contacts').select('id, name, phone');
        setContacts(data || []);
    }

    const startCampaign = async (values: any) => {
        setLoading(true);
        try {
            // 1. Create Campaign row
            const { data: campaign, error } = await supabase.from('campaigns').insert([{
                name: values.name,
                template_name: values.template,
                target_count: contacts.length,
                status: 'draft'
            }]).select().single();

            if (error) throw error;

            message.loading('Kampanya başlatılıyor...');

            // 2. Trigger processing (In a real app, this would be an async background task)
            const response = await fetch('/api/process-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: campaign.id,
                    templateName: values.template,
                    contacts: contacts
                }),
            });

            if (response.ok) {
                message.success('Kampanya tamamlandı!');
                setIsModalOpen(false);
                form.resetFields();
                fetchCampaigns();
            } else {
                throw new Error('Gönderim sırasında hata oluştu');
            }
        } catch (error: any) {
            message.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Kampanya Adı', dataIndex: 'name', key: 'name' },
        { title: 'Şablon', dataIndex: 'template_name', key: 'template' },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: any = { completed: 'green', sending: 'blue', draft: 'orange', failed: 'red' };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Başarı / Toplam',
            render: (_: any, record: any) => (
                <Text>{record.sent_count} / {record.target_count}</Text>
            )
        },
        { title: 'Tarih', dataIndex: 'created_at', key: 'date', render: (d: any) => new Date(d).toLocaleString() }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2}><RocketOutlined /> Toplu Mesaj & Pazarlama</Title>
                    <Text type="secondary">Müşterilerinize toplu WhatsApp kampanyaları gönderin.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Yeni Kampanya</Button>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card><Statistic title="Toplam Müşteri" value={contacts.length} prefix={<TeamOutlined />} /></Card>
                </Col>
                <Col span={8}>
                    <Card><Statistic title="Gönderilen Kampanya" value={campaigns.length} prefix={<HistoryOutlined />} /></Card>
                </Col>
                <Col span={8}>
                    <Card><Statistic title="Aktif Şablonlar" value={3} prefix={<SendOutlined />} /></Card>
                </Col>
            </Row>

            <Card title="Kampanya Geçmişi">
                <Table dataSource={campaigns} columns={columns} rowKey="id" loading={loading} />
            </Card>

            <Modal
                title="Yeni WhatsApp Kampanyası Başlat"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={startCampaign}>
                    <Form.Item name="name" label="Kampanya Başlığı" rules={[{ required: true }]}>
                        <Input placeholder="Örn: Ramazan Bayramı İndirimi" />
                    </Form.Item>
                    <Form.Item name="template" label="WhatsApp Şablonu" rules={[{ required: true }]}>
                        <Select options={[
                            { label: 'Hoşgeldin Mesajı (Standard)', value: 'welcome_v1' },
                            { label: 'İndirim Duyurusu (Marketing)', value: 'promo_spring' },
                            { label: 'Hatırlatma (Support)', value: 'reminder_v2' },
                        ]} />
                    </Form.Item>
                    <Alert
                        message="Dikkat"
                        description={`${contacts.length} müşteriye mesaj gönderilecek. Bu işlem birkaç dakika sürebilir.`}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<RocketOutlined />} block loading={loading}>
                            Kampanyayı Başlat
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// Add missing Alert import helper
import { Alert } from 'antd';
