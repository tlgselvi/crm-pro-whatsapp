'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Table, Space, Typography, Badge, App, Tabs, List, Empty } from 'antd';
import { RobotOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, BookOutlined, SettingOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function AiSettingsPage() {
    const [settingsForm] = Form.useForm();
    const [kbForm] = Form.useForm();
    const [magicForm] = Form.useForm();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [kbData, setKbData] = useState<any[]>([]);
    const [kbLoading, setKbLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchKnowledgeBase();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ai_settings')
                .select('*')
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) settingsForm.setFieldsValue(data);
        } catch (error: any) {
            message.error('Ayarlar yüklenemedi: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchKnowledgeBase() {
        setKbLoading(true);
        try {
            const { data, error } = await supabase
                .from('knowledge_base')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setKbData(data || []);
        } catch (error: any) {
            message.error('Bilgi bankası yüklenemedi');
        } finally {
            setKbLoading(false);
        }
    }

    const onSettingsFinish = async (values: any) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('ai_settings')
                .upsert({
                    id: (await supabase.from('ai_settings').select('id').single()).data?.id || undefined,
                    ...values
                });
            if (error) throw error;
            message.success('AI Ayarları başarıyla güncellendi');
        } catch (error: any) {
            message.error('Güncelleme hatası: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const onKbFinish = async (values: any) => {
        setKbLoading(true);
        try {
            const { error } = await supabase
                .from('knowledge_base')
                .insert(values);
            if (error) throw error;
            kbForm.resetFields();
            fetchKnowledgeBase();
            message.success('Bilgi eklendi');
        } catch (error: any) {
            message.error('Ekleme hatası');
        } finally {
            setKbLoading(false);
        }
    };

    const deleteKbItem = async (id: string) => {
        try {
            const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
            if (error) throw error;
            fetchKnowledgeBase();
            message.success('Bilgi silindi');
        } catch (error: any) {
            message.error('Silme hatası');
        }
    };

    const generateMagicPersona = async (values: any) => {
        setLoading(true);
        try {
            const response = await fetch('/api/generate-persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: values.description }),
            });

            if (!response.ok) throw new Error('Üretim başarısız oldu');

            const data = await response.json();
            if (data.success) {
                message.success('Bot kişiliği ve Bilgi Bankası başarıyla oluşturuldu!');
                await fetchSettings();
                await fetchKnowledgeBase();
                magicForm.resetFields();
            }
        } catch (error: any) {
            message.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const kbColumns = [
        { title: 'Konu', dataIndex: 'topic', key: 'topic', width: '30%' },
        { title: 'İçerik', dataIndex: 'content', key: 'content' },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (_: any, record: any) => (
                <Button danger icon={<DeleteOutlined />} onClick={() => deleteKbItem(record.id)} />
            )
        },
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Title level={2}><RobotOutlined /> AI Eğitim Merkezi</Title>
                    <Paragraph>Botun şirketini daha iyi tanıması için ayarları yap ve bilgi bankasını doldur.</Paragraph>
                </div>
                <Badge status="processing" text="Gemini 2.5 Flash (2026 Standard)" />
            </div>

            <Card
                className="premium-gradient"
                title={<span style={{ color: 'var(--primary-pastel)' }}><PlusOutlined /> Sihirli Değnek (Otomatik Bot Eğitimi)</span>}
                style={{ marginBottom: 24 }}
            >
                <Paragraph style={{ color: 'var(--text-secondary)' }}>
                    İşletmenizi veya web sitenizi kısaca anlatın, AI sizin için en uygun bot kişiliğini ve 5 adet Sıkça Sorulan Soru'yu hazırlasın.
                </Paragraph>
                <Form form={magicForm} onFinish={generateMagicPersona} layout="inline">
                    <Form.Item
                        name="description"
                        rules={[{ required: true, message: 'Lütfen bir açıklama yazın' }]}
                        style={{ flex: 1 }}
                    >
                        <Input placeholder="Örn: Kadıköy'de 3. nesil butik kahveciyiz veya www.sitemiz.com" />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            htmlType="submit"
                            loading={loading}
                        >
                            {loading ? 'Sektörünüz Analiz Ediliyor...' : 'Otomatik Oluştur'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>


            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1',
                    label: <span><SettingOutlined /> Genel Ayarlar</span>,
                    children: (
                        <Card loading={loading}>
                            <Form form={settingsForm} layout="vertical" onFinish={onSettingsFinish}>
                                <Form.Item name="company_name" label="Şirket Adı" rules={[{ required: true }]}>
                                    <Input placeholder="Örn: ABC Teknoloji" />
                                </Form.Item>
                                <Form.Item name="tone" label="Cevap Tonu" rules={[{ required: true }]}>
                                    <Select options={[
                                        { label: 'Profesyonel & Kurumsal', value: 'professional' },
                                        { label: 'Samimi & Dostça', value: 'friendly' },
                                        { label: 'Resmi & Ciddi', value: 'formal' },
                                    ]} />
                                </Form.Item>
                                <Form.Item name="system_instructions" label="Genel Bot Talimatları">
                                    <TextArea rows={4} placeholder="Örn: Müşterilere her zaman ismimizle hitap et, teknik detaylara girme." />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
                                        Ayarları Kaydet
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Card>
                    )
                },
                {
                    key: '2',
                    label: <span><BookOutlined /> Bilgi Bankası</span>,
                    children: (
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Card title="Yeni Bilgi Ekle" size="small">
                                <Form form={kbForm} layout="vertical" onFinish={onKbFinish}>
                                    <Form.Item name="topic" label="Soru veya Konu" rules={[{ required: true }]}>
                                        <Input placeholder="Örn: Çalışma saatleriniz nedir?" />
                                    </Form.Item>
                                    <Form.Item name="content" label="Cevap veya Bilgi" rules={[{ required: true }]}>
                                        <TextArea rows={3} placeholder="Örn: Pazartesi-Cuma 09:00 - 18:00 arası hizmet veriyoruz." />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={kbLoading}>
                                            Ekle
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>

                            <Card title="Kayıtlı Bilgiler">
                                <Table
                                    dataSource={kbData}
                                    columns={kbColumns}
                                    loading={kbLoading}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                />
                            </Card>
                        </Space>
                    )
                }
            ]} />
        </div>
    );
}
