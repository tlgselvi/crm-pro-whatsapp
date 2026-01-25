'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Typography, Badge, App, Input, Form, Switch } from 'antd';
import { RobotOutlined, PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import type { BotRule } from '@/lib/salesbot';

const { Title, Paragraph } = Typography;

export default function SalesbotPage() {
    const [loading, setLoading] = useState(false);
    const [rules, setRules] = useState<BotRule[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { message, modal } = App.useApp();

    useEffect(() => {
        fetchRules();
    }, []);

    async function fetchRules() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bot_rules')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRules(data || []);
        } catch (error: any) {
            message.error('Sistem kuralları yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Convert comma separated keywords to array
            const keywordsArray = typeof values.keywords === 'string'
                ? values.keywords.split(',').map((k: string) => k.trim())
                : values.keywords;

            const { error } = await supabase
                .from('bot_rules')
                .upsert({
                    id: values.id || undefined,
                    keywords: keywordsArray,
                    response: values.response,
                    auto_reply: values.auto_reply ?? true
                });

            if (error) throw error;
            message.success('Kural kaydedildi');
            setIsModalOpen(false);
            form.resetFields();
            fetchRules();
        } catch (error: any) {
            message.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteRule = (id: string) => {
        modal.confirm({
            title: 'Kuralı silmek istediğinize emin misiniz?',
            onOk: async () => {
                const { error } = await supabase.from('bot_rules').delete().eq('id', id);
                if (!error) {
                    message.success('Kural silindi');
                    fetchRules();
                }
            }
        });
    };

    const columns = [
        {
            title: 'Anahtar Kelimeler',
            dataIndex: 'keywords',
            key: 'keywords',
            render: (keywords: string[]) => (
                <Space wrap>
                    {keywords.map(k => <Badge key={k} count={k} style={{ backgroundColor: '#2563eb' }} />)}
                </Space>
            )
        },
        {
            title: 'Bot Yanıtı',
            dataIndex: 'response',
            key: 'response',
            ellipsis: true,
        },
        {
            title: 'Durum',
            dataIndex: 'auto_reply',
            key: 'auto_reply',
            render: (active: boolean) => <Badge status={active ? 'success' : 'default'} text={active ? 'Aktif' : 'Pasif'} />
        },
        {
            title: 'İşlem',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => {
                        form.setFieldsValue({
                            ...record,
                            keywords: record.keywords.join(', ')
                        });
                        setIsModalOpen(true);
                    }} />
                    <Button danger icon={<DeleteOutlined />} onClick={() => deleteRule(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Title level={2}><RobotOutlined /> Satış Botu Kuralları</Title>
                    <Paragraph type="secondary">Müşterilerden gelen belirli kelimelere otomatik yanıtlar tanımlayın.</Paragraph>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    form.resetFields();
                    setIsModalOpen(true);
                }}>
                    Yeni Kural Ekle
                </Button>
            </div>

            <Card className="glass-card" variant="borderless">
                <Table
                    columns={columns}
                    dataSource={rules}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {isModalOpen && (
                <Card
                    title={form.getFieldValue('id') ? 'Kuralı Düzenle' : 'Yeni Kural'}
                    style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: 500, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    extra={<Button type="text" onClick={() => setIsModalOpen(false)}>Kapat</Button>}
                >
                    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ auto_reply: true }}>
                        <Form.Item name="id" hidden><Input /></Form.Item>
                        <Form.Item
                            name="keywords"
                            label="Anahtar Kelimeler (Virgülle ayırın)"
                            rules={[{ required: true, message: 'En az bir kelime yazmalısınız' }]}
                        >
                            <Input placeholder="merhaba, selam, fiyat" />
                        </Form.Item>
                        <Form.Item
                            name="response"
                            label="Bot Yanıtı"
                            rules={[{ required: true, message: 'Yanıt boş olamaz' }]}
                        >
                            <Input.TextArea rows={4} placeholder="Merhaba! Size nasıl yardımcı olabilirim?" />
                        </Form.Item>
                        <Form.Item name="auto_reply" label="Aktif mi?" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" block icon={<SaveOutlined />} htmlType="submit" loading={loading}>
                                Kaydet
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            )}
        </div>
    );
}
